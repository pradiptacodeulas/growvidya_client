import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  fetchStudyMaterialByIdApi,
  createStudyMaterialApi,
  updateStudyMaterialApi,
  fetchMaterialTypesApi,
  fetchClassesApi,
  fetchSectionsApi,
  fetchSubjectsApi,
  fetchAcademicYearsApi,
} from '../../../api/adminAcademic.api';
import {
  fetchTeacherStudyMaterialByIdApi,
  createTeacherStudyMaterialApi,
  updateTeacherStudyMaterialApi,
  fetchTeacherMaterialTypesApi,
  fetchTeacherClassesApi,
  fetchTeacherSectionsApi,
  fetchTeacherSubjectsApi,
  fetchTeacherAcademicYearsApi,
} from '../../../api/teacherAcademic.api';
import { uploadFileApi } from '../../../api/upload.api';
import { decodeParam } from '../../../utils/idHelper';

const EditStudyMaterial = () => {
  const { id: rawId } = useParams();
  const id = decodeParam(rawId);
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const decodedId = id;

  // Masters from Live API
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);

  // Filtered dropdowns
  const [filteredSections, setFilteredSections] = useState([]);
  const [filteredSubjects, setFilteredSubjects] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    academic_year_id: '',
    class_id: '',
    section_id: '',
    subject_id: '',
    material_type_id: '',
    title: '',
    chapter: '',
    description: '',
    publish_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    allow_download: 1,
    display_order: 0,
    status: 1,
    attachment_original_name: '',
    current_attachment_url: '',
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isTeacher = typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';
  const { teacher } = useSelector((state) => state.teacherAuth || {});
  const currentTeacherId = teacher?.id || teacher?.teacher_id || teacher?.userId;

  useEffect(() => {
    loadPrerequisites();
  }, [id, isTeacher]);

  const loadPrerequisites = async () => {
    try {
      setLoading(true);

      const fetchAcademicYears = isTeacher ? fetchTeacherAcademicYearsApi : fetchAcademicYearsApi;
      const fetchMaterialTypes = isTeacher ? fetchTeacherMaterialTypesApi : fetchMaterialTypesApi;
      const fetchClasses = isTeacher ? fetchTeacherClassesApi : fetchClassesApi;
      const fetchSections = isTeacher ? fetchTeacherSectionsApi : fetchSectionsApi;
      const fetchSubjects = isTeacher ? fetchTeacherSubjectsApi : fetchSubjectsApi;
      const fetchStudyMaterialById = isTeacher ? fetchTeacherStudyMaterialByIdApi : fetchStudyMaterialByIdApi;

      const [ayRes, mtRes, clsRes, secRes, subRes] = await Promise.all([
        fetchAcademicYears().catch(() => ({ data: [] })),
        fetchMaterialTypes({ limit: 100 }).catch(() => ({ data: [] })),
        fetchClasses().catch(() => ({ data: [] })),
        fetchSections().catch(() => ({ data: [] })),
        fetchSubjects().catch(() => ({ data: [] })),
      ]);

      const ayList = Array.isArray(ayRes?.data) ? ayRes.data : Array.isArray(ayRes) ? ayRes : [];
      setAcademicYears(ayList);

      const mtList = Array.isArray(mtRes?.data?.material_types)
        ? mtRes.data.material_types
        : Array.isArray(mtRes?.data)
        ? mtRes.data
        : [];
      setMaterialTypes(mtList);

      const clsList = Array.isArray(clsRes?.data) ? clsRes.data : Array.isArray(clsRes) ? clsRes : [];
      setClasses(clsList);

      const secList = Array.isArray(secRes?.data) ? secRes.data : Array.isArray(secRes) ? secRes : [];
      setAllSections(secList);

      const subList = Array.isArray(subRes?.data) ? subRes.data : Array.isArray(subRes) ? subRes : [];
      setAllSubjects(subList);

      if (isEdit && decodedId) {
        let loaded = null;
        try {
          const matRes = await fetchStudyMaterialById(decodedId).catch(() => null);
          if (matRes?.data) {
            loaded = matRes.data;
          }
        } catch (e) {
          // ignore
        }

        if (loaded) {
          if (
            isTeacher &&
            (loaded.uploader_type !== 'teacher' ||
              Number(loaded.uploaded_by) !== Number(currentTeacherId))
          ) {
            toast.error('You can only edit study materials uploaded by yourself.');
            navigate('/teacher/academics/study-materials');
            return;
          }

          const currentYr =
            ayList.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent) ||
            ayList[0];
          const initialClassId = String(loaded.class_id || clsList[0]?.id || '');
          setFormData({
            academic_year_id: String(loaded.academic_year_id || currentYr?.id || ''),
            class_id: initialClassId,
            section_id: String(loaded.section_id || ''),
            subject_id: String(loaded.subject_id || ''),
            material_type_id: String(loaded.material_type_id || mtList[0]?.id || ''),
            title: loaded.title || '',
            chapter: loaded.chapter || '',
            description: loaded.description || '',
            publish_date: loaded.publish_date ? loaded.publish_date.split('T')[0] : new Date().toISOString().split('T')[0],
            expiry_date: loaded.expiry_date ? loaded.expiry_date.split('T')[0] : '',
            allow_download: loaded.allow_download !== undefined ? Number(loaded.allow_download) : 1,
            display_order: loaded.display_order || 0,
            status: loaded.status !== undefined ? Number(loaded.status) : 1,
            attachment_original_name: loaded.attachment_original_name || '',
            current_attachment_url: loaded.attachment || '',
          });

          filterDropdownsByClass(initialClassId, secList, subList);
        }
      } else {
        const defaultClassId = String(clsList[0]?.id || '');
        const currentYr =
          ayList.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent) ||
          ayList[0];
        setFormData((prev) => ({
          ...prev,
          academic_year_id: String(currentYr?.id || ''),
          class_id: defaultClassId,
          material_type_id: String(mtList[0]?.id || ''),
        }));
        filterDropdownsByClass(defaultClassId, secList, subList);
      }
    } catch (err) {
      console.warn('Error loading form data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterDropdownsByClass = (classId, secList = allSections, subList = allSubjects) => {
    const classSections = secList.filter(
      (s) =>
        String(s.class_id) === String(classId) &&
        (s.status === undefined || s.status === null || Number(s.status) === 1)
    );
    setFilteredSections(classSections);

    const classSubjects = subList.filter(
      (s) =>
        (!s.class_id || String(s.class_id) === String(classId)) &&
        (s.status === undefined || s.status === null || Number(s.status) === 1)
    );
    setFilteredSubjects(classSubjects);
  };

  const handleClassChange = async (newClassId) => {
    setFormData((prev) => ({
      ...prev,
      class_id: newClassId,
      section_id: '',
      subject_id: '',
    }));
    if (newClassId) {
      try {
        const fetchSections = isTeacher ? fetchTeacherSectionsApi : fetchSectionsApi;
        const fetchSubjects = isTeacher ? fetchTeacherSubjectsApi : fetchSubjectsApi;
        const [secRes, subRes] = await Promise.all([
          fetchSections(newClassId).catch(() => ({ data: [] })),
          fetchSubjects({ classId: newClassId }).catch(() => ({ data: [] })),
        ]);
        const secList = Array.isArray(secRes?.data) ? secRes.data : Array.isArray(secRes) ? secRes : [];
        const subList = Array.isArray(subRes?.data) ? subRes.data : Array.isArray(subRes) ? subRes : [];
        const activeSecs = secList.filter((s) => s.status === undefined || s.status === null || Number(s.status) === 1);
        const activeSubs = subList.filter((s) => s.status === undefined || s.status === null || Number(s.status) === 1);
        setFilteredSections(activeSecs);
        setFilteredSubjects(activeSubs);
      } catch (e) {
        filterDropdownsByClass(newClassId);
      }
    } else {
      filterDropdownsByClass(newClassId);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFormData((prev) => ({
        ...prev,
        attachment_original_name: file.name,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Material Title is required.');
      return;
    }
    if (!formData.academic_year_id) {
      toast.error('Academic Year is required.');
      return;
    }
    if (!formData.class_id) {
      toast.error('Class is required.');
      return;
    }
    if (!formData.subject_id) {
      toast.error('Subject is required.');
      return;
    }
    if (!formData.material_type_id) {
      toast.error('Material Type is required.');
      return;
    }

    try {
      setSaving(true);

      let finalAttachment = isEdit ? (formData.current_attachment_url || null) : null;
      let finalOriginalName = isEdit ? (formData.attachment_original_name || null) : null;
      let finalSize = isEdit ? (formData.attachment_size || null) : null;
      let finalExtension = isEdit ? (formData.attachment_extension || null) : null;

      // If user selected a new file to upload
      if (selectedFile) {
        try {
          const uploadRes = await uploadFileApi(selectedFile, 'study_material');
          if (uploadRes?.data?.file_path) {
            finalAttachment = uploadRes.data.file_path;
            finalOriginalName = uploadRes.data.file_name || selectedFile.name;
            finalSize = uploadRes.data.size || selectedFile.size;
            finalExtension = (uploadRes.data.file_name || selectedFile.name).split('.').pop() || 'pdf';
          }
        } catch (uploadErr) {
          console.warn('File upload failed or fallback to direct path:', uploadErr);
          // Fallback to recording original filename if server saved directly
          finalOriginalName = selectedFile.name;
          finalSize = selectedFile.size;
          finalExtension = selectedFile.name.split('.').pop() || 'pdf';
        }
      }

      const payload = {
        academic_year_id: formData.academic_year_id,
        class_id: formData.class_id,
        section_id: formData.section_id || null,
        subject_id: formData.subject_id,
        material_type_id: formData.material_type_id,
        title: formData.title.trim(),
        chapter: formData.chapter.trim(),
        description: formData.description.trim(),
        publish_date: formData.publish_date,
        expiry_date: formData.expiry_date || null,
        allow_download: Number(formData.allow_download),
        display_order: Number(formData.display_order) || 0,
        status: Number(formData.status),
        attachment: finalAttachment,
        attachment_original_name: finalOriginalName,
        attachment_size: finalSize,
        attachment_extension: finalExtension,
      };

      if (isEdit) {
        const updateStudyMaterial = isTeacher ? updateTeacherStudyMaterialApi : updateStudyMaterialApi;
        await updateStudyMaterial(decodedId, payload);
        toast.success('Study Material updated successfully.');
      } else {
        const createStudyMaterial = isTeacher ? createTeacherStudyMaterialApi : createStudyMaterialApi;
        await createStudyMaterial(payload);
        toast.success('Study Material created successfully.');
      }

      navigate(`${basePath}/academics/study-materials`);
    } catch (err) {
      toast.error(err.message || (isEdit ? 'Failed to update study material.' : 'Failed to create study material.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="content content-two">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-muted mt-2">Loading form details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="mb-1">{isEdit ? 'Edit Study Material' : 'Add Study Material'}</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to={`${basePath}/academics/study-materials`}>Study Material</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {isEdit ? 'Edit Study Material' : 'Add Study Material'}
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      <div className="row">
        <div className="col-md-12">
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            {/* Information Card */}
            <div className="card shadow-sm border-0">
              <div className="card-header bg-light py-3 border-bottom">
                <div className="d-flex align-items-center">
                  <h4 className="text-dark mb-0 fs-16 fw-semibold">Study Material Information</h4>
                </div>
              </div>

              <div className="card-body pb-1">
                <div className="row g-3">
                  {/* Academic Year */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label fw-medium text-dark">
                        Academic Year <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select select"
                        name="academic_year_id"
                        id="academic_year_id"
                        required
                        value={formData.academic_year_id}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Year</option>
                        {academicYears.map((ay) => (
                          <option key={ay.id} value={ay.id}>
                            {ay.academic_year || ay.year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Class */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label fw-medium text-dark">
                        Class <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select select"
                        name="class_id"
                        id="class_id"
                        required
                        value={formData.class_id}
                        onChange={(e) => handleClassChange(e.target.value)}
                      >
                        <option value="">Select Class</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.class_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Section */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label fw-medium text-dark">
                        Section <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select select"
                        name="section_id"
                        id="section_id"
                        value={formData.section_id}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Section</option>
                        {filteredSections.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.section_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label fw-medium text-dark">
                        Subject <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select select"
                        name="subject_id"
                        id="subject_id"
                        required
                        value={formData.subject_id}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Subject</option>
                        {filteredSubjects.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.subject_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Material Type */}
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label fw-medium text-dark">
                        Material Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select select"
                        name="material_type_id"
                        id="material_type_id"
                        required
                        value={formData.material_type_id}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Type</option>
                        {materialTypes.map((mt) => (
                          <option key={mt.id} value={mt.id}>
                            {mt.material_type_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="col-md-5">
                    <div className="mb-3">
                      <label className="form-label fw-medium text-dark">
                        Title <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="title"
                        id="title"
                        required
                        placeholder="Enter study material title"
                        value={formData.title}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  {/* Chapter / Topic */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label fw-medium text-dark">Chapter / Topic</label>
                      <input
                        type="text"
                        className="form-control"
                        name="chapter"
                        id="chapter"
                        placeholder="e.g. Chapter 1: Introduction"
                        value={formData.chapter}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label fw-medium text-dark">Description (Optional)</label>
                      <textarea
                        className="form-control"
                        name="description"
                        id="description"
                        rows={4}
                        placeholder="Enter description"
                        value={formData.description}
                        onChange={handleInputChange}
                      ></textarea>
                    </div>
                  </div>

                  {/* Attachment */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-medium text-dark">Attachment</label>
                      <input
                        type="file"
                        className="form-control"
                        name="attachment"
                        id="attachment"
                        onChange={handleFileChange}
                      />
                      <small className="text-muted d-block mt-1">
                        Supported formats: PDF, DOC, DOCX (Max 10MB)
                      </small>
                      {formData.attachment_original_name && (
                        <div className="mt-2 text-sm text-success d-flex align-items-center gap-1">
                          <i className="ti ti-check"></i>
                          <span>Current attachment:</span>
                          <a
                            href={formData.current_attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="fw-medium text-decoration-underline text-success ms-1"
                          >
                            {formData.attachment_original_name}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Publish Date */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label fw-medium text-dark">
                        Publish Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        name="publish_date"
                        id="publish_date"
                        required
                        value={formData.publish_date}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  {/* Expiry Date */}
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label fw-medium text-dark">Expiry Date</label>
                      <input
                        type="date"
                        className="form-control"
                        name="expiry_date"
                        id="expiry_date"
                        value={formData.expiry_date}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  {/* Allow Download */}
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label fw-medium text-dark">
                        Allow Download? <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        name="allow_download"
                        id="allow_download"
                        required
                        value={formData.allow_download}
                        onChange={handleInputChange}
                      >
                        <option value={1}>Yes (Students can download file)</option>
                        <option value={0}>No (Students can only preview online)</option>
                      </select>
                    </div>
                  </div>

                  {/* Display Order */}
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label fw-medium text-dark">Display Order</label>
                      <input
                        type="number"
                        className="form-control"
                        name="display_order"
                        id="display_order"
                        placeholder="0"
                        min="0"
                        value={formData.display_order}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label fw-medium text-dark">
                        Status <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        name="status"
                        id="status"
                        required
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value={1}>Active</option>
                        <option value={2}>Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-footer bg-transparent border-top text-end py-3 px-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="btn btn-light me-3 px-4"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-4"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : isEdit ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
            {/* /Information Card */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditStudyMaterial;
