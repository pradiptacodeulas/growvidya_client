import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  DEFAULT_BRANCH_LOCATION,
  RADIUS_MIN,
  RADIUS_MAX,
  ACCURACY_MIN,
  ACCURACY_MAX,
  hasCoordinates,
  parseWorkingDays,
} from './branchLocation.util';
import './BranchLocationPicker.css';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const MAP_ID = 'DEMO_MAP_ID';
const FALLBACK_CENTER = { lat: 20.5937, lng: 78.9629 }; // India
const FALLBACK_ZOOM = 5;
const PIN_ZOOM = 17;
const BRAND_COLOR = '#4F46E5';

const WEEK_DAYS = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 7, label: 'Sun' },
];

const round7 = (n) => Math.round(Number(n) * 1e7) / 1e7;

/**
 * Geofence radius overlay drawn with google.maps.Circle on the current map.
 */
const RadiusCircle = ({ center, radius }) => {
  const map = useMap();
  const circleRef = useRef(null);

  useEffect(() => {
    if (!map || !window.google?.maps) return undefined;
    const circle = new window.google.maps.Circle({
      map,
      clickable: false,
      strokeColor: BRAND_COLOR,
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: BRAND_COLOR,
      fillOpacity: 0.15,
    });
    circleRef.current = circle;
    return () => {
      circle.setMap(null);
      circleRef.current = null;
    };
  }, [map]);

  const lat = center?.lat;
  const lng = center?.lng;
  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;
    if (lat === undefined || lat === null || lng === undefined || lng === null) {
      circle.setVisible(false);
      return;
    }
    circle.setCenter({ lat, lng });
    circle.setRadius(Math.max(0, Number(radius) || 0));
    circle.setVisible(true);
  }, [map, lat, lng, radius]);

  return null;
};

/**
 * Pans / zooms the map whenever a new pan target is requested.
 */
const MapPanController = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || !target) return;
    if (target.bounds) {
      map.fitBounds(target.bounds);
      return;
    }
    map.panTo({ lat: target.lat, lng: target.lng });
    if (target.zoom && (map.getZoom() || 0) < target.zoom) {
      map.setZoom(target.zoom);
    }
  }, [map, target]);
  return null;
};

/**
 * Places search box. Prefers the new PlaceAutocompleteElement (Places API New)
 * and falls back to the legacy google.maps.places.Autocomplete widget.
 */
const PlaceSearchBox = ({ onPlaceSelected, disabled }) => {
  const places = useMapsLibrary('places');
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const callbackRef = useRef(onPlaceSelected);

  useEffect(() => {
    callbackRef.current = onPlaceSelected;
  }, [onPlaceSelected]);

  const useElement = !!places?.PlaceAutocompleteElement;

  // New PlaceAutocompleteElement
  useEffect(() => {
    if (!places || !useElement || !containerRef.current) return undefined;
    let element;
    try {
      element = new places.PlaceAutocompleteElement({});
    } catch (err) {
      console.error('Failed to init PlaceAutocompleteElement:', err);
      return undefined;
    }
    element.setAttribute('placeholder', 'Search campus address or landmark...');

    const emitPlace = async (place) => {
      if (!place) return;
      try {
        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
        if (!place.location) return;
        callbackRef.current?.({
          lat: place.location.lat(),
          lng: place.location.lng(),
          address: place.formattedAddress || place.displayName || '',
        });
      } catch (err) {
        console.error('Failed to fetch place details:', err);
      }
    };
    // Current event name
    const handleSelect = (ev) => emitPlace(ev?.placePrediction?.toPlace?.());
    // Older (beta) event name
    const handleLegacySelect = (ev) => emitPlace(ev?.place);

    element.addEventListener('gmp-select', handleSelect);
    element.addEventListener('gmp-placeselect', handleLegacySelect);
    containerRef.current.appendChild(element);

    return () => {
      element.removeEventListener('gmp-select', handleSelect);
      element.removeEventListener('gmp-placeselect', handleLegacySelect);
      element.remove();
    };
  }, [places, useElement]);

  // Legacy Autocomplete widget fallback
  useEffect(() => {
    if (!places || useElement || !inputRef.current || !places.Autocomplete) return undefined;
    const autocomplete = new places.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'geometry', 'name'],
    });
    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const loc = place?.geometry?.location;
      if (!loc) return;
      callbackRef.current?.({
        lat: loc.lat(),
        lng: loc.lng(),
        address: place.formatted_address || place.name || '',
      });
    });
    return () => {
      listener.remove();
      window.google?.maps?.event?.clearInstanceListeners(autocomplete);
    };
  }, [places, useElement]);

  return (
    <div className={`branch-loc-search mb-2 ${disabled ? 'branch-loc-disabled' : ''}`}>
      {useElement ? (
        <div ref={containerRef} />
      ) : (
        <div className="position-relative">
          <i
            className="ti ti-search position-absolute text-muted"
            style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }}
          ></i>
          <input
            ref={inputRef}
            type="text"
            className="form-control form-control-sm ps-5"
            placeholder={places ? 'Search campus address or landmark...' : 'Loading search...'}
            disabled={disabled || !places}
            onKeyDown={(e) => {
              // Prevent the enclosing form from submitting while picking a suggestion
              if (e.key === 'Enter') e.preventDefault();
            }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Search box + map + marker + radius circle. Must be rendered inside <APIProvider>.
 */
const MapSection = ({
  value,
  disabled,
  panTarget,
  initialAddressHint,
  onPick,
  onPlaceSelected,
  onCenterRequest,
  geoApiRef,
}) => {
  const geocoding = useMapsLibrary('geocoding');
  const lastHintRef = useRef('');
  const reqSeqRef = useRef(0);

  const hasPin = hasCoordinates(value);
  const position = hasPin ? { lat: Number(value.latitude), lng: Number(value.longitude) } : null;

  // Expose reverse geocoding to the parent (used by "Use my current location" / manual entry)
  useEffect(() => {
    if (!geoApiRef) return undefined;
    geoApiRef.current.reverseGeocode = async (lat, lng) => {
      if (!geocoding) return null;
      const seq = ++reqSeqRef.current;
      try {
        const geocoder = new geocoding.Geocoder();
        const { results } = await geocoder.geocode({ location: { lat, lng } });
        if (seq !== reqSeqRef.current) return null; // a newer request superseded this one
        return results?.[0]?.formatted_address || null;
      } catch (err) {
        console.error('Reverse geocoding failed:', err);
        return null;
      }
    };
    const api = geoApiRef.current;
    return () => {
      api.reverseGeocode = null;
    };
  }, [geocoding, geoApiRef]);

  // Center the map from the address hint while no pin is set yet (debounced)
  useEffect(() => {
    const hint = initialAddressHint?.trim();
    if (!geocoding || hasPin || !hint || lastHintRef.current === hint) return undefined;
    const timer = setTimeout(() => {
      lastHintRef.current = hint;
      const geocoder = new geocoding.Geocoder();
      geocoder
        .geocode({ address: hint })
        .then(({ results }) => {
          const geometry = results?.[0]?.geometry;
          if (!geometry?.location) return;
          onCenterRequest({
            lat: geometry.location.lat(),
            lng: geometry.location.lng(),
            bounds: geometry.viewport || null,
          });
        })
        .catch(() => {
          /* ignore – keep the current center */
        });
    }, 700);
    return () => clearTimeout(timer);
  }, [geocoding, hasPin, initialAddressHint, onCenterRequest]);

  const handleMapClick = (ev) => {
    if (disabled) return;
    const latLng = ev?.detail?.latLng;
    if (!latLng) return;
    onPick(latLng.lat, latLng.lng);
  };

  const handleDragEnd = (ev) => {
    if (disabled || !ev?.latLng) return;
    onPick(ev.latLng.lat(), ev.latLng.lng());
  };

  return (
    <>
      <PlaceSearchBox onPlaceSelected={onPlaceSelected} disabled={disabled} />
      <div className="branch-loc-map">
        <GoogleMap
          mapId={MAP_ID}
          defaultCenter={position || FALLBACK_CENTER}
          defaultZoom={position ? PIN_ZOOM : FALLBACK_ZOOM}
          gestureHandling="greedy"
          clickableIcons={false}
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={true}
          onClick={handleMapClick}
          style={{ width: '100%', height: '100%' }}
        >
          {position && (
            <AdvancedMarker
              position={position}
              draggable={!disabled}
              onDragEnd={handleDragEnd}
              title="Campus attendance point"
            >
              <Pin background={BRAND_COLOR} borderColor="#3730A3" glyphColor="#ffffff" />
            </AdvancedMarker>
          )}
          <RadiusCircle center={position} radius={value.attendance_radius_m} />
          <MapPanController target={panTarget} />
        </GoogleMap>
      </div>
      <div className="fs-11 text-muted mt-1">
        <i className="ti ti-hand-click me-1"></i>
        Click on the map or drag the pin to set the exact attendance point.
      </div>
    </>
  );
};

/**
 * Reusable branch attendance-location picker (geofence for Teacher App self check-in).
 *
 * Props:
 *  - value: { latitude, longitude, geo_address, attendance_radius_m, gps_max_accuracy_m,
 *             late_after, working_days, geo_attendance_enabled }
 *  - onChange(newValue)
 *  - disabled
 *  - initialAddressHint: address string geocoded for the initial map center when no pin exists
 */
const BranchLocationPicker = ({ value, onChange, disabled = false, initialAddressHint = '' }) => {
  const current = { ...DEFAULT_BRANCH_LOCATION, ...(value || {}) };

  // Keep latest value in a ref so async callbacks (geocoding) never merge into stale state
  const valueRef = useRef(current);
  useLayoutEffect(() => {
    valueRef.current = { ...DEFAULT_BRANCH_LOCATION, ...(value || {}) };
  }, [value]);

  const geoApiRef = useRef({ reverseGeocode: null });
  const [panTarget, setPanTarget] = useState(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [mapsLoadError, setMapsLoadError] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');

  const mapsAvailable = !!GOOGLE_MAPS_API_KEY && !mapsLoadError;
  const showManualInputs = manualEntry || !mapsAvailable;

  const update = useCallback(
    (patch) => {
      const next = { ...valueRef.current, ...patch };
      valueRef.current = next;
      onChange?.(next);
    },
    [onChange]
  );

  const requestCenter = useCallback((target) => {
    setPanTarget({ ...target, key: Date.now() });
  }, []);

  const fillAddress = useCallback(
    async (lat, lng) => {
      const fn = geoApiRef.current.reverseGeocode;
      if (!fn) return;
      const address = await fn(lat, lng);
      if (address) update({ geo_address: address });
    },
    [update]
  );

  const handlePick = useCallback(
    (lat, lng) => {
      const la = round7(lat);
      const ln = round7(lng);
      update({ latitude: la, longitude: ln });
      fillAddress(la, ln);
    },
    [update, fillAddress]
  );

  const handlePlaceSelected = useCallback(
    ({ lat, lng, address }) => {
      const la = round7(lat);
      const ln = round7(lng);
      update({ latitude: la, longitude: ln, geo_address: address || valueRef.current.geo_address });
      requestCenter({ lat: la, lng: ln, zoom: PIN_ZOOM });
    },
    [update, requestCenter]
  );

  const handleUseCurrentLocation = () => {
    setLocateError('');
    if (!navigator.geolocation) {
      setLocateError('Geolocation is not supported by this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const la = round7(pos.coords.latitude);
        const ln = round7(pos.coords.longitude);
        update({ latitude: la, longitude: ln });
        requestCenter({ lat: la, lng: ln, zoom: PIN_ZOOM });
        fillAddress(la, ln);
      },
      (err) => {
        setLocating(false);
        setLocateError(
          err?.code === 1
            ? 'Location permission denied. Please allow location access in your browser.'
            : 'Unable to fetch your current location.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleManualCoordChange = (field, raw) => {
    update({ [field]: raw === '' ? null : Number(raw) });
  };

  const handleManualCoordBlur = () => {
    const v = valueRef.current;
    if (hasCoordinates(v)) {
      requestCenter({ lat: Number(v.latitude), lng: Number(v.longitude), zoom: PIN_ZOOM });
    }
  };

  const selectedDays = parseWorkingDays(current.working_days);
  const toggleDay = (dayId) => {
    const set = new Set(selectedDays);
    if (set.has(dayId)) {
      if (set.size === 1) return; // at least one working day
      set.delete(dayId);
    } else {
      set.add(dayId);
    }
    update({ working_days: Array.from(set).sort((a, b) => a - b).join(',') });
  };

  const radiusNum = Number(current.attendance_radius_m) || DEFAULT_BRANCH_LOCATION.attendance_radius_m;
  const enabled = Number(current.geo_attendance_enabled) === 1;
  const hasPin = hasCoordinates(current);

  return (
    <div className="branch-location-picker">
      {/* Enable switch */}
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 p-3 rounded bg-light border mb-3">
        <div className="form-check form-switch mb-0">
          <input
            type="checkbox"
            className="form-check-input"
            id="geo_attendance_enabled"
            checked={enabled}
            disabled={disabled}
            onChange={(e) => update({ geo_attendance_enabled: e.target.checked ? 1 : 0 })}
          />
          <label className="form-check-label fs-12 fw-semibold text-dark ms-1" htmlFor="geo_attendance_enabled">
            Enable app attendance (Teacher App)
          </label>
          <div className="fs-11 text-muted ms-1">
            Teachers can mark their own attendance from the Teacher App only when they are inside the radius below.
          </div>
        </div>
        {hasPin ? (
          <span className="badge bg-success-subtle text-success border border-success-subtle fs-11">
            <i className="ti ti-map-pin-check me-1"></i>Location pinned
          </span>
        ) : (
          <span className="badge bg-warning-subtle text-warning border border-warning-subtle fs-11">
            <i className="ti ti-map-pin-off me-1"></i>Location not set
          </span>
        )}
      </div>

      <div className="row g-3">
        {/* Map column */}
        <div className="col-12 col-lg-7">
          {!GOOGLE_MAPS_API_KEY && (
            <div className="alert alert-warning py-2 px-3 fs-12 mb-2 d-flex align-items-start gap-2">
              <i className="ti ti-alert-triangle fs-16"></i>
              <span>
                Google Maps is not configured (<code>VITE_GOOGLE_MAPS_API_KEY</code> missing). You can still enter
                latitude / longitude manually or use your current location.
              </span>
            </div>
          )}
          {GOOGLE_MAPS_API_KEY && mapsLoadError && (
            <div className="alert alert-warning py-2 px-3 fs-12 mb-2 d-flex align-items-start gap-2">
              <i className="ti ti-alert-triangle fs-16"></i>
              <span>Google Maps failed to load. Please enter latitude / longitude manually.</span>
            </div>
          )}

          {mapsAvailable && (
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY} onError={() => setMapsLoadError(true)}>
              <MapSection
                value={current}
                disabled={disabled}
                panTarget={panTarget}
                initialAddressHint={initialAddressHint}
                onPick={handlePick}
                onPlaceSelected={handlePlaceSelected}
                onCenterRequest={requestCenter}
                geoApiRef={geoApiRef}
              />
            </APIProvider>
          )}

          {/* Coordinates */}
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
              onClick={handleUseCurrentLocation}
              disabled={disabled || locating}
            >
              {locating ? (
                <span className="spinner-border spinner-border-sm" role="status" />
              ) : (
                <i className="ti ti-current-location fs-14"></i>
              )}
              <span>{locating ? 'Locating...' : 'Use my current location'}</span>
            </button>
            {mapsAvailable && (
              <div className="form-check form-switch mb-0">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="geo_manual_entry"
                  checked={manualEntry}
                  disabled={disabled}
                  onChange={(e) => setManualEntry(e.target.checked)}
                />
                <label className="form-check-label fs-12 text-dark ms-1" htmlFor="geo_manual_entry">
                  Manual entry
                </label>
              </div>
            )}
          </div>
          {locateError && <div className="fs-11 text-danger mt-1">{locateError}</div>}

          <div className="row g-2 mt-1">
            <div className="col-6">
              <label className="form-label fs-12 fw-semibold text-dark mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                min="-90"
                max="90"
                className="form-control form-control-sm font-monospace"
                placeholder="e.g. 22.9751"
                value={current.latitude ?? ''}
                readOnly={!showManualInputs}
                disabled={disabled}
                onChange={(e) => handleManualCoordChange('latitude', e.target.value)}
                onBlur={handleManualCoordBlur}
              />
            </div>
            <div className="col-6">
              <label className="form-label fs-12 fw-semibold text-dark mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                min="-180"
                max="180"
                className="form-control form-control-sm font-monospace"
                placeholder="e.g. 88.4345"
                value={current.longitude ?? ''}
                readOnly={!showManualInputs}
                disabled={disabled}
                onChange={(e) => handleManualCoordChange('longitude', e.target.value)}
                onBlur={handleManualCoordBlur}
              />
            </div>
            <div className="col-12">
              <label className="form-label fs-12 fw-semibold text-dark mb-1 d-flex align-items-center justify-content-between">
                <span>Location Address</span>
                {hasPin && (
                  <a
                    href={`https://www.google.com/maps?q=${current.latitude},${current.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fs-11 fw-normal"
                  >
                    <i className="ti ti-external-link me-1"></i>Open in Google Maps
                  </a>
                )}
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Auto-filled from the map pin"
                maxLength={500}
                value={current.geo_address || ''}
                disabled={disabled}
                onChange={(e) => update({ geo_address: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Rules column */}
        <div className="col-12 col-lg-5">
          {/* Radius */}
          <div className="mb-3">
            <label className="form-label fs-12 fw-semibold text-dark d-flex align-items-center justify-content-between">
              <span>
                Attendance Radius <span className="text-danger">*</span>
              </span>
              <span className="text-muted fw-normal fs-11">
                {RADIUS_MIN}–{RADIUS_MAX} m
              </span>
            </label>
            <div className="d-flex align-items-center gap-2">
              <input
                type="range"
                className="form-range flex-grow-1"
                min={RADIUS_MIN}
                max={RADIUS_MAX}
                step={10}
                value={Math.min(Math.max(radiusNum, RADIUS_MIN), RADIUS_MAX)}
                disabled={disabled}
                onChange={(e) => update({ attendance_radius_m: Number(e.target.value) })}
              />
              <div className="input-group input-group-sm" style={{ width: '120px' }}>
                <input
                  type="number"
                  className="form-control"
                  min={RADIUS_MIN}
                  max={RADIUS_MAX}
                  value={current.attendance_radius_m ?? ''}
                  disabled={disabled}
                  onChange={(e) =>
                    update({ attendance_radius_m: e.target.value === '' ? '' : Number(e.target.value) })
                  }
                />
                <span className="input-group-text">m</span>
              </div>
            </div>
            <div className="fs-11 text-muted mt-1">
              Teachers must be within this distance of the pin to check in.
            </div>
          </div>

          {/* GPS accuracy */}
          <div className="mb-3">
            <label className="form-label fs-12 fw-semibold text-dark d-flex align-items-center justify-content-between">
              <span>
                GPS Max Accuracy <span className="text-danger">*</span>
              </span>
              <span className="text-muted fw-normal fs-11">
                {ACCURACY_MIN}–{ACCURACY_MAX} m
              </span>
            </label>
            <div className="input-group input-group-sm">
              <input
                type="number"
                className="form-control"
                min={ACCURACY_MIN}
                max={ACCURACY_MAX}
                value={current.gps_max_accuracy_m ?? ''}
                disabled={disabled}
                onChange={(e) =>
                  update({ gps_max_accuracy_m: e.target.value === '' ? '' : Number(e.target.value) })
                }
              />
              <span className="input-group-text">m</span>
            </div>
            <div className="fs-11 text-muted mt-1">
              Check-ins with a weaker GPS fix than this are rejected.
            </div>
          </div>

          {/* Late after */}
          <div className="mb-3">
            <label className="form-label fs-12 fw-semibold text-dark">
              Mark as Late After <span className="text-danger">*</span>
            </label>
            <input
              type="time"
              className="form-control form-control-sm"
              value={String(current.late_after || '').slice(0, 5)}
              disabled={disabled}
              onChange={(e) => update({ late_after: e.target.value })}
            />
            <div className="fs-11 text-muted mt-1">Check-ins after this time are recorded as Late.</div>
          </div>

          {/* Working days */}
          <div className="mb-1">
            <label className="form-label fs-12 fw-semibold text-dark">
              Working Days <span className="text-danger">*</span>
            </label>
            <div className="d-flex flex-wrap gap-1">
              {WEEK_DAYS.map((d) => {
                const active = selectedDays.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    className={`btn btn-sm branch-loc-day-chip ${active ? 'btn-primary' : 'btn-outline-light text-dark border'}`}
                    disabled={disabled}
                    aria-pressed={active}
                    onClick={() => toggleDay(d.id)}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <div className="fs-11 text-muted mt-1">Self check-in is blocked on non-working days and holidays.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchLocationPicker;
