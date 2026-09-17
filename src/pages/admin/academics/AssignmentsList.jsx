import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchClassesApi, fetchSectionsApi, fetchShiftsApi } from '../../../api/adminAcademic.api';
import NoData from '../../../components/common/NoData';
import { encodeParam } from '../../../utils/idHelper';

const AssignmentsList = () => {
  const [shifts, setShifts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShiftsAndClasses();
  }, []);

  const fetchShiftsAndClasses = async () => {
    try {
      setLoading(true);
      const [shiftsRes, classesRes, sectionsRes] = await Promise.all([
        fetchShiftsApi().catch(() => ({ data: [] })),
        fetchClassesApi().catch(() => ({ data: [] })),
        fetchSectionsApi().catch(() => ({ data: [] })),
      ]);

      const shiftList = Array.isArray(shiftsRes?.data) ? shiftsRes.data : Array.isArray(shiftsRes) ? shiftsRes : [];
      const classList = Array.isArray(classesRes?.data) ? classesRes.data : Array.isArray(classesRes) ? classesRes : [];
      const sectionList = Array.isArray(sectionsRes?.data) ? sectionsRes.data : Array.isArray(sectionsRes) ? sectionsRes : [];

      setShifts(shiftList.filter((s) => s.status === 1));
      setClasses(classList.filter((c) => c.status === 1));
      setSections(sectionList.filter((s) => s.status === 1 || (s.status !== 4 && s.status !== 0)));
    } catch (err) {
      toast.error('Failed to load class assignment shifts.');
    } finally {
      setLoading(false);
    }
  };

  const getClassSections = (classId) => {
    return sections.filter((s) => String(s.class_id) === String(classId));
  };

  const hasClasses = classes.length > 0;
  const hasSections = sections.length > 0;
  const hasClassWithSections = classes.some((cls) =>
    sections.some((s) => String(s.class_id) === String(cls.id))
  );

  // Group classes by shift
  const groupedShifts = shifts.map((shift) => {
    const shiftClasses = classes.filter(
      (c) =>
        Number(c.shift_id) === Number(shift.id) ||
        (c.shift_name && c.shift_name.trim().toLowerCase() === shift.shift_name.trim().toLowerCase())
    );
    return {
      ...shift,
      classes: shiftClasses,
    };
  });

  // Handle any classes without an assigned shift
  const unassignedClasses = classes.filter(
    (c) =>
      !shifts.some(
        (s) =>
          Number(s.id) === Number(c.shift_id) ||
          (c.shift_name && c.shift_name.trim().toLowerCase() === s.shift_name.trim().toLowerCase())
      )
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Class Assignment</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/admin/academics/assignments">Class Assignment</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Class Assignment
              </li>
            </ol>
          </nav>
        </div>
        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="pe-1 mb-2">
            <button
              type="button"
              onClick={fetchShiftsAndClasses}
              className="btn btn-outline-light bg-white btn-icon me-1"
              title="Refresh"
            >
              <i className="ti ti-refresh text-dark"></i>
            </button>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Shifts & Classes Grid */}
      <div className="p-0 py-3">
        {loading ? (
          <div className="card p-5 text-center shadow-sm border-0">
            <div className="spinner-border text-primary mx-auto mb-3" role="status"></div>
            <p className="text-muted mb-0">Loading class assignments structure...</p>
          </div>
        ) : !hasClasses ? (
          <div className="card shadow-sm border p-5 text-center">
            <NoData
              title="No Classes Found"
              message="No active classes found. Please configure classes and sections in Academics to manage assignments."
              imageHeight={120}
              py={3}
              action={
                <div className="d-flex justify-content-center gap-2 flex-wrap">
                  <Link to="/admin/academics/classes" className="btn btn-primary">
                    <i className="ti ti-school me-1"></i> Add Classes
                  </Link>
                  <Link to="/admin/academics/sections" className="btn btn-outline-primary">
                    <i className="ti ti-layout-grid me-1"></i> Add Sections
                  </Link>
                </div>
              }
            />
          </div>
        ) : !hasSections || !hasClassWithSections ? (
          <div className="card shadow-sm border p-5 text-center">
            <NoData
              title="No Sections Found"
              message="No active sections configured for your classes. Please add sections in Academics to manage assignments."
              imageHeight={120}
              py={3}
              action={
                <Link to="/admin/academics/sections" className="btn btn-primary">
                  <i className="ti ti-layout-grid me-1"></i> Add Sections
                </Link>
              }
            />
          </div>
        ) : groupedShifts.length === 0 && unassignedClasses.length === 0 ? (
          <div className="card shadow-sm border p-5 text-center">
            <NoData
              title="No Classes Found"
              message="No classes or sections are available for assignments."
              imageHeight={120}
              py={3}
            />
          </div>
        ) : (
          <>
            {groupedShifts.map((shift) => (
              <div key={shift.id} className="card shift-card mb-4 shadow-sm border">
                <div className="card-header shift-header bg-light py-3 px-4 border-bottom">
                  <h5 className="mb-0 text-dark fw-bold d-flex align-items-center">
                    <i className="ti ti-clock me-2 text-primary fs-18"></i>
                    Shift : {shift.shift_name ? shift.shift_name.trim() : `Shift ${shift.id}`}
                  </h5>
                </div>

                <div className="card-body p-4">
                  {shift.classes.length === 0 ? (
                    <NoData
                      title="No Classes Assigned"
                      message="No classes assigned to this shift."
                      imageHeight={80}
                      py={2}
                    />
                  ) : (
                    <div className="row g-3">
                      {shift.classes.map((cls) => {
                        const clsSections = getClassSections(cls.id);
                        return (
                          <div key={cls.id} className="col-xl-3 col-lg-4 col-md-6">
                            <Link
                              to={`/admin/academics/assignments/section/${encodeParam(cls.id)}`}
                              className="text-decoration-none"
                            >
                              <div className="class-card text-center p-4 border rounded shadow-sm bg-white hover-shadow transition-all">
                                <div
                                  className="class-icon mb-3 mx-auto bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center"
                                  style={{ width: '56px', height: '56px' }}
                                >
                                  <i className="ti ti-school fs-24"></i>
                                </div>
                                <h6 className="mb-1 text-dark fw-bold fs-16">{cls.class_name}</h6>
                                <span
                                  className={`badge ${
                                    clsSections.length > 0
                                      ? 'bg-primary-subtle text-primary'
                                      : 'bg-warning-subtle text-warning'
                                  } fs-12 fw-medium`}
                                >
                                  {clsSections.length > 0
                                    ? `${clsSections.length} Section${clsSections.length > 1 ? 's' : ''}`
                                    : 'No Sections'}
                                </span>
                              </div>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {unassignedClasses.length > 0 && (
              <div className="card shift-card mb-4 shadow-sm border">
                <div className="card-header shift-header bg-light py-3 px-4 border-bottom">
                  <h5 className="mb-0 text-dark fw-bold d-flex align-items-center">
                    <i className="ti ti-layers me-2 text-secondary fs-18"></i>
                    Other Classes
                  </h5>
                </div>
                <div className="card-body p-4">
                  <div className="row g-3">
                    {unassignedClasses.map((cls) => {
                      const clsSections = getClassSections(cls.id);
                      return (
                        <div key={cls.id} className="col-xl-3 col-lg-4 col-md-6">
                          <Link
                            to={`/admin/academics/assignments/section/${encodeParam(cls.id)}`}
                            className="text-decoration-none"
                          >
                            <div className="class-card text-center p-4 border rounded shadow-sm bg-white hover-shadow transition-all">
                              <div
                                className="class-icon mb-3 mx-auto bg-secondary-subtle text-secondary rounded-circle d-flex align-items-center justify-content-center"
                                style={{ width: '56px', height: '56px' }}
                              >
                                <i className="ti ti-school fs-24"></i>
                              </div>
                              <h6 className="mb-1 text-dark fw-bold fs-16">{cls.class_name}</h6>
                              <span
                                className={`badge ${
                                  clsSections.length > 0
                                    ? 'bg-primary-subtle text-primary'
                                    : 'bg-warning-subtle text-warning'
                                } fs-12 fw-medium`}
                              >
                                {clsSections.length > 0
                                  ? `${clsSections.length} Section${clsSections.length > 1 ? 's' : ''}`
                                  : 'No Sections'}
                              </span>
                            </div>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AssignmentsList;
