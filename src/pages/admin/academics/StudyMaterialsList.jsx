import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  fetchStudyMaterialsApi,
  fetchMaterialTypesApi,
  createMaterialTypeApi,
  updateMaterialTypeApi,
  deleteMaterialTypeApi,
  createStudyMaterialApi,
  updateStudyMaterialApi,
  toggleStudyMaterialStatusApi,
  deleteStudyMaterialApi,
  fetchClassesApi,
  fetchSectionsApi,
  fetchSubjectsApi,
  fetchAcademicYearsApi,
} from '../../../api/adminAcademic.api';
import {
  fetchTeacherStudyMaterialsApi,
  fetchTeacherMaterialTypesApi,
  createTeacherMaterialTypeApi,
  updateTeacherMaterialTypeApi,
  deleteTeacherMaterialTypeApi,
  createTeacherStudyMaterialApi,
  updateTeacherStudyMaterialApi,
  deleteTeacherStudyMaterialApi,
  toggleTeacherStudyMaterialStatusApi,
  fetchTeacherClassesApi,
  fetchTeacherSectionsApi,
  fetchTeacherSubjectsApi,
  fetchTeacherAcademicYearsApi,
} from '../../../api/teacherAcademic.api';
import { uploadFileApi } from '../../../api/upload.api';
import { resolveImageUrl, getApiBaseUrl } from '../../../utils/url.util';
import TableActionMenu from '../../../components/common/TableActionMenu';

const formatFileSize = (bytes) => {
  const sz = Number(bytes) || 0;
  if (sz >= 1048576) {
    return (sz / 1048576).toFixed(2) + ' MB';
  } else if (sz >= 1024) {
    return (sz / 1024).toFixed(2) + ' KB';
  }
  return sz + ' B';
};

const StudyMaterialsList = () => {
  const isTeacher = typeof window !== 'undefined' && window.location.pathname.startsWith('/teacher');
  const basePath = isTeacher ? '/teacher' : '/admin';

  const { teacher } = useSelector((state) => state.teacherAuth || {});
  const currentTeacherId = teacher?.id || teacher?.teacher_id || teacher?.userId;

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeScope, setActiveScope] = useState('all'); // 'all' | 'my_uploads'

  // Masters from Live API
  const [academicYears, setAcademicYears] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Filter State
  const [filters, setFilters] = useState({
    academic_year_id: '',
    material_type_id: '',
    class_id: '',
    section_id: '',
    subject_id: '',
    status: '',
    search: '',
  });

  const [appliedFilters, setAppliedFilters] = useState({
    academic_year_id: '',
    material_type_id: '',
    class_id: '',
    section_id: '',
    subject_id: '',
    status: '',
    search: '',
  });

  const [filterCollapse, setFilterCollapse] = useState(true);

  // Server-Level Pagination & Search
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [tableSearch, setTableSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  // Modals State
  const [viewMaterial, setViewMaterial] = useState(null);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Material Types Management Modal
  const [showTypesModal, setShowTypesModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [editingTypeId, setEditingTypeId] = useState(null);

  // Add / Edit Form State
  const [formData, setFormData] = useState({
    title: '',
    chapter: '',
    description: '',
    academic_year_id: '',
    material_type_id: '',
    class_id: '',
    section_id: '',
    subject_id: '',
    attachment_url: '',
    attachment_name: '',
    allow_download: 1,
    status: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalFile, setModalFile] = useState(null);

  // Cascaded sections/subjects for modal form
  const [formSections, setFormSections] = useState([]);
  const [formSubjects, setFormSubjects] = useState([]);

  const dropdownRef = useRef(null);

  useEffect(() => {
    loadMasters();
    loadMaterials(1, 10, {
      academic_year_id: '',
      material_type_id: '',
      class_id: '',
      section_id: '',
      subject_id: '',
      status: '',
      search: '',
    }, '');
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadMasters = async () => {
    try {
      const fetchAcademicYears = isTeacher ? fetchTeacherAcademicYearsApi : fetchAcademicYearsApi;
      const fetchMaterialTypes = isTeacher ? fetchTeacherMaterialTypesApi : fetchMaterialTypesApi;
      const fetchClasses = isTeacher ? fetchTeacherClassesApi : fetchClassesApi;
      const fetchSections = isTeacher ? fetchTeacherSectionsApi : fetchSectionsApi;
      const fetchSubjects = isTeacher ? fetchTeacherSubjectsApi : fetchSubjectsApi;

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
      setSections(secList);

      const subList = Array.isArray(subRes?.data) ? subRes.data : Array.isArray(subRes) ? subRes : [];
      setSubjects(subList);
    } catch (err) {
      console.warn('Error loading prerequisites:', err);
    }
  };

  const loadMaterials = async (page = currentPage, limit = perPage, filterObj = appliedFilters, searchVal = tableSearch) => {
    try {
      setLoading(true);
      const queryParams = {
        page: Number(page) || 1,
        limit: Number(limit) || 10,
      };

      // Scope support (all vs my_uploads)
      const effectiveScope = filterObj.scope !== undefined ? filterObj.scope : activeScope;
      if (isTeacher && effectiveScope === 'my_uploads') {
        queryParams.scope = 'my_uploads';
      }

      // Only attach defined, non-empty filter parameters
      if (filterObj.academic_year_id && String(filterObj.academic_year_id).trim() !== '') {
        queryParams.academic_year_id = filterObj.academic_year_id;
      }
      if (filterObj.material_type_id && String(filterObj.material_type_id).trim() !== '') {
        queryParams.material_type_id = filterObj.material_type_id;
      }
      if (filterObj.class_id && String(filterObj.class_id).trim() !== '') {
        queryParams.class_id = filterObj.class_id;
      }
      if (filterObj.section_id && String(filterObj.section_id).trim() !== '') {
        queryParams.section_id = filterObj.section_id;
      }
      if (filterObj.subject_id && String(filterObj.subject_id).trim() !== '') {
        queryParams.subject_id = filterObj.subject_id;
      }
      if (filterObj.status && String(filterObj.status).trim() !== '') {
        queryParams.status = filterObj.status;
      }
      const combinedSearch = (searchVal && searchVal.trim()) || (filterObj.search && filterObj.search.trim()) || '';
      if (combinedSearch) {
        queryParams.search = combinedSearch;
      }

      const fetchStudyMaterials = isTeacher ? fetchTeacherStudyMaterialsApi : fetchStudyMaterialsApi;
      const res = await fetchStudyMaterials(queryParams).catch(() => null);

      const data = res?.data;
      const list = Array.isArray(data?.study_materials)
        ? data.study_materials
        : Array.isArray(data)
        ? data
        : [];

      setMaterials(list);
      const total = data?.total !== undefined ? Number(data.total) : list.length;
      const tPages = data?.totalPages !== undefined ? Number(data.totalPages) : Math.ceil(total / limit) || 1;
      setTotalRecords(total);
      setTotalPages(tPages);
    } catch (err) {
      console.warn('Error fetching study materials:', err);
      setMaterials([]);
      setTotalRecords(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleScopeChange = (newScope) => {
    setActiveScope(newScope);
    setCurrentPage(1);
    loadMaterials(1, perPage, { ...appliedFilters, scope: newScope }, tableSearch);
  };

  // Filter Handlers
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterClassChange = (classId) => {
    setFilters((prev) => ({
      ...prev,
      class_id: classId,
      section_id: '',
      subject_id: '',
    }));
  };

  // Dynamically load sections and subjects when filter class_id changes
  const [filterSections, setFilterSections] = useState([]);
  const [filterSubjects, setFilterSubjects] = useState([]);

  useEffect(() => {
    if (!filters.class_id) {
      setFilterSections([]);
      setFilterSubjects([]);
      return;
    }
    const loadDynamicClassMasters = async () => {
      try {
        const fetchSections = isTeacher ? fetchTeacherSectionsApi : fetchSectionsApi;
        const fetchSubjects = isTeacher ? fetchTeacherSubjectsApi : fetchSubjectsApi;
        const [secRes, subRes] = await Promise.all([
          fetchSections(filters.class_id).catch(() => ({ data: [] })),
          fetchSubjects({ classId: filters.class_id }).catch(() => ({ data: [] })),
        ]);
        const secList = Array.isArray(secRes?.data) ? secRes.data : Array.isArray(secRes) ? secRes : [];
        const subList = Array.isArray(subRes?.data) ? subRes.data : Array.isArray(subRes) ? subRes : [];
        setFilterSections(secList.filter((s) => s.status === undefined || s.status === null || Number(s.status) === 1));
        setFilterSubjects(subList.filter((s) => s.status === undefined || s.status === null || Number(s.status) === 1));
      } catch (err) {
        console.error('Error loading filter sections/subjects:', err);
      }
    };
    loadDynamicClassMasters();
  }, [filters.class_id]);

  const handleApplyFilter = (e) => {
    if (e) e.preventDefault();
    setAppliedFilters({ ...filters });
    setCurrentPage(1);
    loadMaterials(1, perPage, filters, tableSearch);
  };

  const handleResetFilter = () => {
    const emptyFilters = {
      academic_year_id: '',
      material_type_id: '',
      class_id: '',
      section_id: '',
      subject_id: '',
      status: '',
      search: '',
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setFilterSections([]);
    setFilterSubjects([]);
    setTableSearch('');
    setCurrentPage(1);
    loadMaterials(1, perPage, emptyFilters, '');
  };

  // Debounced search on tableSearch or filters.search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadMaterials(1, perPage, appliedFilters, tableSearch);
    }, 350);
    return () => clearTimeout(timer);
  }, [tableSearch]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    loadMaterials(newPage, perPage, appliedFilters, tableSearch);
  };

  const handlePerPageChange = (newLimit) => {
    setPerPage(newLimit);
    setCurrentPage(1);
    loadMaterials(1, newLimit, appliedFilters, tableSearch);
  };

  const handleTableSearchChange = (e) => {
    const val = e.target.value;
    setTableSearch(val);
    setCurrentPage(1);
  };

  // Fallback cascaded sections and subjects for main filter
  const displayedSections = filterSections.length > 0 ? filterSections : sections.filter(
    (s) => (s.status === undefined || s.status === null || Number(s.status) === 1) &&
      (!filters.class_id || String(s.class_id) === String(filters.class_id))
  );

  const displayedSubjects = filterSubjects.length > 0 ? filterSubjects : subjects.filter(
    (s) => (s.status === undefined || s.status === null || Number(s.status) === 1) &&
      (!filters.class_id || !s.class_id || String(s.class_id) === String(filters.class_id))
  );

  // Toggle Status
  const handleToggleStatus = async (id, currentStatus, material) => {
    if (
      isTeacher &&
      material &&
      (material.uploader_type !== 'teacher' ||
        Number(material.uploaded_by) !== Number(currentTeacherId))
    ) {
      toast.warning('You can only change the status of study materials you uploaded.');
      return;
    }
    try {
      const toggleStatusApi = isTeacher ? toggleTeacherStudyMaterialStatusApi : toggleStudyMaterialStatusApi;
      await toggleStatusApi(id);
      const nextStatus = Number(currentStatus) === 1 ? 2 : 1;
      setMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: nextStatus } : m))
      );
      toast.success('Status updated successfully.');
    } catch (err) {
      toast.error('Failed to toggle status.');
    }
  };

  // Delete Action
  const handleDeleteClick = (material) => {
    const matId = typeof material === 'object' ? material.id : material;
    const matObj = typeof material === 'object' ? material : materials.find((m) => m.id === matId);

    if (
      isTeacher &&
      matObj &&
      (matObj.uploader_type !== 'teacher' ||
        Number(matObj.uploaded_by) !== Number(currentTeacherId))
    ) {
      toast.warning('You can only delete study materials you uploaded.');
      return;
    }
    setDeletingId(matId);
    setShowDeleteModal(true);
    setActiveDropdownId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      const deleteStudyMaterial = isTeacher ? deleteTeacherStudyMaterialApi : deleteStudyMaterialApi;
      await deleteStudyMaterial(deletingId);
      setMaterials((prev) => prev.filter((m) => m.id !== deletingId));
      toast.success('Study material deleted successfully.');
      loadMaterials(currentPage, perPage, appliedFilters, tableSearch);
    } catch (err) {
      toast.error('Failed to delete study material.');
    } finally {
      setShowDeleteModal(false);
      setDeletingId(null);
    }
  };

  // Select All Checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(materials.map((m) => m.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Open Add / Edit Modal
  const handleOpenAddModal = () => {
    setEditingMaterial(null);
    setModalFile(null);
    const activeClasses = classes.filter((c) => c.status === undefined || Number(c.status) === 1);
    const firstClassId = activeClasses[0]?.id || '1';
    const currentYear =
      academicYears.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent) ||
      academicYears[0];
    setFormData({
      title: '',
      chapter: '',
      description: '',
      academic_year_id: currentYear?.id ? String(currentYear.id) : '1',
      material_type_id: materialTypes[0]?.id || '1',
      class_id: firstClassId,
      section_id: '',
      subject_id: '',
      attachment_url: '',
      attachment_name: '',
      allow_download: 1,
      status: 1,
    });
    setFormSections(
      sections.filter(
        (s) =>
          String(s.class_id) === String(firstClassId) &&
          (s.status === undefined || Number(s.status) === 1)
      )
    );
    setFormSubjects(
      subjects.filter(
        (s) =>
          (!s.class_id || String(s.class_id) === String(firstClassId)) &&
          (s.status === undefined || Number(s.status) === 1)
      )
    );
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (material) => {
    setEditingMaterial(material);
    setModalFile(null);
    const currentYear =
      academicYears.find((y) => Number(y.is_current) === 1 || String(y.is_current) === '1' || y.isCurrent) ||
      academicYears[0];
    setFormData({
      title: material.title || '',
      chapter: material.chapter || '',
      description: material.description || '',
      academic_year_id: material.academic_year_id || currentYear?.id || '1',
      material_type_id: material.material_type_id || materialTypes[0]?.id || '1',
      class_id: material.class_id || '',
      section_id: material.section_id || '',
      subject_id: material.subject_id || '',
      attachment_url: material.attachment || '',
      attachment_name: material.attachment_original_name || material.attachment_name || '',
      attachment_size: material.attachment_size || '',
      attachment_extension: material.attachment_extension || '',
      allow_download: material.allow_download !== undefined ? Number(material.allow_download) : 1,
      status: material.status !== undefined ? Number(material.status) : 1,
    });
    const clsId = material.class_id;
    setFormSections(
      sections.filter(
        (s) =>
          String(s.class_id) === String(clsId) &&
          (s.status === undefined || Number(s.status) === 1)
      )
    );
    setFormSubjects(
      subjects.filter(
        (s) =>
          (!s.class_id || String(s.class_id) === String(clsId)) &&
          (s.status === undefined || Number(s.status) === 1)
      )
    );
    setShowAddEditModal(true);
    setActiveDropdownId(null);
  };

  const handleModalClassChange = (classId) => {
    setFormData((prev) => ({
      ...prev,
      class_id: classId,
      section_id: '',
      subject_id: '',
    }));
    setFormSections(
      sections.filter(
        (s) =>
          String(s.class_id) === String(classId) &&
          (s.status === undefined || Number(s.status) === 1)
      )
    );
    setFormSubjects(
      subjects.filter(
        (s) =>
          (!s.class_id || String(s.class_id) === String(classId)) &&
          (s.status === undefined || Number(s.status) === 1)
      )
    );
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please provide a title.');
      return;
    }
    if (!formData.class_id) {
      toast.error('Please select a class.');
      return;
    }
    if (!formData.subject_id) {
      toast.error('Please select a subject.');
      return;
    }

    try {
      setSubmitting(true);

      let finalAttachment = editingMaterial ? (formData.attachment_url || null) : null;
      let finalOriginalName = editingMaterial ? (formData.attachment_name || null) : null;
      let finalSize = editingMaterial ? (formData.attachment_size || null) : null;
      let finalExtension = editingMaterial ? (formData.attachment_extension || null) : null;

      if (modalFile) {
        try {
          const uploadRes = await uploadFileApi(modalFile, 'study_material');
          if (uploadRes?.data?.file_path) {
            finalAttachment = uploadRes.data.file_path;
            finalOriginalName = uploadRes.data.file_name || modalFile.name;
            finalSize = uploadRes.data.size || modalFile.size;
            finalExtension = (uploadRes.data.file_name || modalFile.name).split('.').pop() || 'pdf';
          }
        } catch (uploadErr) {
          console.warn('File upload fallback:', uploadErr);
          finalOriginalName = modalFile.name;
          finalSize = modalFile.size;
          finalExtension = modalFile.name.split('.').pop() || 'pdf';
        }
      }

      const payload = {
        title: formData.title.trim(),
        chapter: formData.chapter.trim(),
        description: formData.description.trim(),
        academic_year_id: formData.academic_year_id || undefined,
        material_type_id: formData.material_type_id || undefined,
        class_id: formData.class_id,
        section_id: formData.section_id || null,
        subject_id: formData.subject_id,
        attachment: finalAttachment,
        attachment_original_name: finalOriginalName,
        attachment_size: finalSize,
        attachment_extension: finalExtension,
        allow_download: Number(formData.allow_download) || 1,
        status: Number(formData.status) || 1,
      };

      if (editingMaterial) {
        const updateStudyMaterial = isTeacher ? updateTeacherStudyMaterialApi : updateStudyMaterialApi;
        await updateStudyMaterial(editingMaterial.id, payload);
        toast.success('Study material updated successfully.');
      } else {
        const createStudyMaterial = isTeacher ? createTeacherStudyMaterialApi : createStudyMaterialApi;
        await createStudyMaterial(payload);
        toast.success('Study material added successfully.');
      }
      setShowAddEditModal(false);
      setModalFile(null);
      loadMaterials(1, perPage, appliedFilters, tableSearch);
    } catch (err) {
      toast.error(err.message || 'Failed to save study material.');
    } finally {
      setSubmitting(false);
    }
  };

  // Material Types Management
  const handleSaveMaterialType = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;

    try {
      if (editingTypeId) {
        const updateMaterialType = isTeacher ? updateTeacherMaterialTypeApi : updateMaterialTypeApi;
        await updateMaterialType(editingTypeId, {
          material_type_name: newTypeName.trim(),
          description: newTypeDesc.trim(),
        }).catch(() => null);

        setMaterialTypes((prev) =>
          prev.map((t) =>
            t.id === editingTypeId
              ? { ...t, material_type_name: newTypeName.trim(), description: newTypeDesc.trim() }
              : t
          )
        );
        toast.success('Material type updated.');
        setEditingTypeId(null);
      } else {
        const createMaterialType = isTeacher ? createTeacherMaterialTypeApi : createMaterialTypeApi;
        const res = await createMaterialType({
          material_type_name: newTypeName.trim(),
          description: newTypeDesc.trim(),
          status: 1,
        }).catch(() => ({ data: { id: Date.now() } }));

        const newId = res?.data?.id || Date.now();
        setMaterialTypes((prev) => [
          ...prev,
          { id: newId, material_type_name: newTypeName.trim(), description: newTypeDesc.trim(), status: 1 },
        ]);
        toast.success('Material type added.');
      }
      setNewTypeName('');
      setNewTypeDesc('');
    } catch (err) {
      toast.error('Failed to save material type.');
    }
  };

  const handleDeleteMaterialType = async (id) => {
    try {
      const deleteMaterialType = isTeacher ? deleteTeacherMaterialTypeApi : deleteMaterialTypeApi;
      await deleteMaterialType(id).catch(() => null);
      setMaterialTypes((prev) => prev.filter((t) => t.id !== id));
      toast.success('Material type removed.');
    } catch (err) {
      toast.error('Failed to remove material type.');
    }
  };

  const handleDownloadAttachment = async (e, material) => {
    if (e) e.preventDefault();
    if (!material?.attachment) {
      toast.info('No attachment available for this study material.');
      return;
    }

    const filename =
      material.attachment_original_name ||
      (material.title
        ? `${material.title.replace(/[^a-zA-Z0-9_\-\. ]/g, '_')}.${material.attachment_extension || 'pdf'}`
        : 'study_material.pdf');

    const token = localStorage.getItem('admin_token') || localStorage.getItem('token') || '';
    const apiDownloadUrl = `${getApiBaseUrl()}/admin/academics/study-materials/download/${material.id}`;
    const staticUrl = resolveImageUrl(material.attachment);

    try {
      // 1. Try server download endpoint
      const res = await fetch(apiDownloadUrl, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          const blob = await res.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(blobUrl);
          return;
        }
      }

      // 2. Try direct static URL from backend
      if (staticUrl) {
        const staticRes = await fetch(staticUrl);
        if (staticRes.ok) {
          const contentType = staticRes.headers.get('content-type') || '';
          if (!contentType.includes('text/html')) {
            const blob = await staticRes.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            return;
          }
        }
      }

      toast.error('The attached file could not be found on the server.');
    } catch (err) {
      if (staticUrl) {
        window.open(staticUrl, '_blank');
      } else {
        toast.error('Failed to download file.');
      }
    }
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Study Material List</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to={`${basePath}/dashboard`}>Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Academic</li>
              <li className="breadcrumb-item">Study Material</li>
              <li className="breadcrumb-item active" aria-current="page">
                All Study Material
              </li>
            </ol>
          </nav>
        </div>

        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
          <div className="mb-2 me-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white d-flex align-items-center"
              onClick={handleResetFilter}
              title="Refresh / Reset"
            >
              <i className="ti ti-refresh text-dark"></i>
            </button>
          </div>

          <div className="mb-2 me-2">
            <button
              type="button"
              className="btn btn-outline-light bg-white d-flex align-items-center"
              onClick={() => setShowTypesModal(true)}
            >
              <i className="ti ti-category me-2"></i>Material Types
            </button>
          </div>

          <div className="mb-2">
            <Link
              to={`${basePath}/academics/study-materials/add`}
              className="btn btn-primary d-flex align-items-center"
            >
              <i className="ti ti-square-rounded-plus me-2"></i>Add Study Material
            </Link>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* Filter Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div
          className="card-header bg-transparent border-bottom d-flex align-items-center justify-content-between py-3 cursor-pointer"
          onClick={() => setFilterCollapse(!filterCollapse)}
        >
          <div className="d-flex align-items-center gap-2">
            <i className="ti ti-filter fs-18 text-primary"></i>
            <h5 className="card-title mb-0 fs-16 fw-semibold">Filter Study Material</h5>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-icon btn-light rounded-circle shadow-none"
            aria-expanded={filterCollapse}
          >
            <i className={`ti ${filterCollapse ? 'ti-chevron-up' : 'ti-chevron-down'}`}></i>
          </button>
        </div>

        {filterCollapse && (
          <div className="card-body">
            <form onSubmit={handleApplyFilter} id="filterForm">
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label fw-medium text-dark">Academic Year</label>
                  <select
                    name="academic_year_id"
                    className="form-select"
                    value={filters.academic_year_id}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Academic Years</option>
                    {academicYears
                      .filter((ay) => ay.status === undefined || ay.status === null || Number(ay.status) === 1)
                      .map((ay) => (
                        <option key={ay.id} value={ay.id}>
                          {ay.academic_year || ay.year}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-medium text-dark">Material Type</label>
                  <select
                    name="material_type_id"
                    className="form-select"
                    value={filters.material_type_id}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Material Types</option>
                    {materialTypes
                      .filter((mt) => mt.status === undefined || mt.status === null || Number(mt.status) === 1)
                      .map((mt) => (
                        <option key={mt.id} value={mt.id}>
                          {mt.material_type_name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-medium text-dark">Class</label>
                  <select
                    name="class_id"
                    id="filter_class_id"
                    className="form-select"
                    value={filters.class_id}
                    onChange={(e) => handleFilterClassChange(e.target.value)}
                  >
                    <option value="">All Classes</option>
                    {classes
                      .filter((cls) => cls.status === undefined || cls.status === null || Number(cls.status) === 1)
                      .map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.class_name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-medium text-dark">Section</label>
                  <select
                    name="section_id"
                    id="filter_section_id"
                    className="form-select"
                    value={filters.section_id}
                    onChange={handleFilterChange}
                    disabled={!filters.class_id}
                  >
                    <option value="">
                      {!filters.class_id ? 'Select Class First' : 'All Sections'}
                    </option>
                    {displayedSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.section_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-medium text-dark">Subject</label>
                  <select
                    name="subject_id"
                    id="filter_subject_id"
                    className="form-select"
                    value={filters.subject_id}
                    onChange={handleFilterChange}
                    disabled={!filters.class_id}
                  >
                    <option value="">
                      {!filters.class_id ? 'Select Class First' : 'All Subjects'}
                    </option>
                    {displayedSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.subject_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-medium text-dark">Status</label>
                  <select
                    name="status"
                    className="form-select"
                    value={filters.status}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Status</option>
                    <option value="1">Active</option>
                    <option value="2">Inactive</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-medium text-dark">Search Keyword</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white">
                      <i className="ti ti-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      name="search"
                      className="form-control"
                      placeholder="Search title, chapter, description..."
                      value={filters.search}
                      onChange={handleFilterChange}
                    />
                  </div>
                </div>

                <div className="col-md-2 d-flex align-items-end gap-2">
                  <button type="submit" className="btn btn-primary w-100 fw-medium">
                    <i className="ti ti-filter me-1"></i>Filter
                  </button>
                  <button
                    type="button"
                    className="btn btn-light border w-100 fw-medium"
                    onClick={handleResetFilter}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
      {/* /Filter Card */}

      {/* Study Material List Table Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-transparent border-bottom d-flex flex-wrap align-items-center justify-content-between gap-2 py-3">
          <div className="d-flex align-items-center gap-3">
            <h4 className="card-title mb-0 fs-18 fw-semibold">
              {isTeacher && activeScope === 'my_uploads' ? 'My Uploaded Study Materials' : 'All Study Materials'}
            </h4>
            {isTeacher && (
              <div className="btn-group btn-group-sm" role="group" aria-label="Scope filter">
                <button
                  type="button"
                  className={`btn ${activeScope === 'all' ? 'btn-primary active' : 'btn-outline-primary'}`}
                  onClick={() => handleScopeChange('all')}
                >
                  <i className="ti ti-files me-1"></i>All Materials
                </button>
                <button
                  type="button"
                  className={`btn ${activeScope === 'my_uploads' ? 'btn-primary active' : 'btn-outline-primary'}`}
                  onClick={() => handleScopeChange('my_uploads')}
                >
                  <i className="ti ti-upload me-1"></i>My Uploads
                </button>
              </div>
            )}
          </div>
          <span className="badge bg-primary-subtle text-primary px-3 py-2 fs-12 rounded-pill fw-semibold">
            Total: {totalRecords} Records
          </span>
        </div>

        <div className="card-body p-0">
          <div className="p-3 border-bottom d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-2">
              <label className="text-muted small mb-0">Row Per Page</label>
              <select
                className="form-select form-select-sm"
                style={{ width: '80px' }}
                value={perPage}
                onChange={(e) => handlePerPageChange(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-muted small">Entries</span>
            </div>

            <div style={{ maxWidth: '280px', width: '100%' }}>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white">
                  <i className="ti ti-search text-muted"></i>
                </span>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Quick Search table..."
                  value={tableSearch}
                  onChange={handleTableSearchChange}
                />
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 datatable-responsive">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '40px' }} className="text-center">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={materials.length > 0 && selectedIds.length === materials.length}
                        onChange={handleSelectAll}
                      />
                    </div>
                  </th>
                  <th>Title &amp; Topic</th>
                  <th className="text-center">Type</th>
                  <th className="text-center">Subject</th>
                  <th className="text-center">Class / Section</th>
                  <th className="text-center">Uploaded By</th>
                  <th className="text-center">Attachment</th>
                  <th className="text-center" style={{ width: '100px' }}>
                    Status
                  </th>
                  <th className="text-center" style={{ width: '80px' }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-2 text-muted fs-13">Loading study materials...</p>
                    </td>
                  </tr>
                ) : materials.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <i className="ti ti-folder-off fs-36 mb-2 d-block text-secondary opacity-50"></i>
                      <div className="fw-semibold">No study materials found</div>
                      <div className="text-xs">
                        {isTeacher && activeScope === 'my_uploads'
                          ? 'You have not uploaded any study materials yet.'
                          : 'Try modifying your filter options or add a new study material.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  materials.map((material) => {
                    const ext = (material.attachment_extension || '').toLowerCase();
                    let iconClass = 'ti-file-text text-secondary';
                    if (['pdf'].includes(ext)) iconClass = 'ti-file-type-pdf text-danger';
                    else if (['doc', 'docx'].includes(ext)) iconClass = 'ti-file-type-docx text-primary';
                    else if (['ppt', 'pptx'].includes(ext)) iconClass = 'ti-file-type-ppt text-warning';
                    else if (['zip', 'rar'].includes(ext)) iconClass = 'ti-file-zip text-success';
                    else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) iconClass = 'ti-photo text-info';

                    const isMyUpload =
                      isTeacher &&
                      material.uploader_type === 'teacher' &&
                      Number(material.uploaded_by) === Number(currentTeacherId);
                    const canManage = !isTeacher || isMyUpload;

                    return (
                      <tr key={material.id}>
                        <td className="text-center">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={selectedIds.includes(material.id)}
                              onChange={() => handleSelectItem(material.id)}
                              value={material.id}
                            />
                          </div>
                        </td>
                        <td className="text-start">
                          <div className="fw-bold text-dark mb-1 fs-14">{material.title}</div>
                          {material.chapter && (
                            <div className="text-xs text-primary mb-1">
                              <i className="ti ti-bookmark me-1"></i>Topic: {material.chapter}
                            </div>
                          )}
                          {material.description && (
                            <div className="text-xs text-muted" style={{ maxWidth: '320px' }}>
                              {material.description.length > 80
                                ? material.description.substring(0, 80) + '...'
                                : material.description}
                            </div>
                          )}
                        </td>
                        <td className="text-center">
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 radius-4 fw-medium text-xs">
                            {material.material_type_name || '-'}
                          </span>
                        </td>
                        <td className="text-center fw-medium text-dark">
                          {material.subject_name || '-'}
                        </td>
                        <td className="text-center">
                          <span className="badge bg-light text-dark border px-2 py-1 text-xs">
                            {material.class_name || '-'}
                            {material.section_name ? ` (${material.section_name})` : ''}
                          </span>
                        </td>
                        <td className="text-center text-xs">
                          <div className="fw-medium text-dark">
                            {isMyUpload ? 'You' : material.uploaded_by_name || 'Admin'}
                          </div>
                          <span
                            className={`badge px-2 py-0-5 text-xxs mt-1 ${
                              isMyUpload
                                ? 'bg-success-subtle text-success border border-success-subtle'
                                : 'bg-secondary-subtle text-secondary'
                            }`}
                          >
                            {isMyUpload
                              ? 'My Upload'
                              : material.uploader_type === 'admin'
                              ? 'Admin'
                              : 'Teacher'}
                          </span>
                        </td>
                        <td className="text-center">
                          {material.attachment ? (
                            <div>
                              <div
                                className="text-xs text-start mb-1 text-truncate mx-auto"
                                style={{ maxWidth: '150px' }}
                                title={material.attachment_original_name || 'Attachment'}
                              >
                                <i className={`ti ${iconClass} fs-16 me-1`}></i>
                                {material.attachment_original_name || 'Attachment'}
                              </div>
                              {material.attachment_size ? (
                                <div className="text-xxs text-muted mb-2">
                                  Size: {formatFileSize(material.attachment_size)}
                                </div>
                              ) : null}
                              <button
                                type="button"
                                onClick={(e) => handleDownloadAttachment(e, material)}
                                className="btn btn-xs btn-primary px-2 py-1 d-inline-flex align-items-center gap-1 border-0"
                              >
                                <i className="ti ti-download fs-12"></i> Download
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted text-xs">No attachment</span>
                          )}
                        </td>
                        <td className="text-center">
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(material.id, material.status, material)}
                              className="btn btn-link p-0 text-decoration-none border-0"
                              title="Click to toggle status"
                            >
                              {Number(material.status) === 1 ? (
                                <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 radius-4 fw-medium text-xs">
                                  <i className="ti ti-circle-check me-1"></i>Active
                                </span>
                              ) : (
                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 radius-4 fw-medium text-xs">
                                  <i className="ti ti-circle-x me-1"></i>Inactive
                                </span>
                              )}
                            </button>
                          ) : (
                            <span
                              className={`badge px-2 py-1 radius-4 fw-medium text-xs ${
                                Number(material.status) === 1
                                  ? 'bg-success-subtle text-success border border-success-subtle'
                                  : 'bg-danger-subtle text-danger border border-danger-subtle'
                              }`}
                              title="Read-only (Uploaded by Admin/Other Teacher)"
                            >
                              {Number(material.status) === 1 ? (
                                <>
                                  <i className="ti ti-circle-check me-1"></i>Active
                                </>
                              ) : (
                                <>
                                  <i className="ti ti-circle-x me-1"></i>Inactive
                                </>
                              )}
                            </span>
                          )}
                        </td>
                        <td
                          className="text-center position-relative text-nowrap"
                          style={{ width: '80px', minWidth: '80px', whiteSpace: 'nowrap' }}
                        >
                          <TableActionMenu
                            items={[
                              {
                                label: 'View Details',
                                icon: 'ti ti-eye text-info',
                                to: `${basePath}/academics/study-materials/view/${material.id}`,
                              },
                              ...(material.attachment
                                ? [
                                    {
                                      label: 'Download File',
                                      icon: 'ti ti-download text-primary',
                                      onClick: (e) => handleDownloadAttachment(e, material),
                                    },
                                  ]
                                : []),
                              ...(canManage
                                ? [
                                    {
                                      label: 'Edit Material',
                                      icon: 'ti ti-edit text-warning',
                                      to: `${basePath}/academics/study-materials/edit/${material.id}`,
                                    },
                                    {
                                      label: 'Delete Material',
                                      icon: 'ti ti-trash',
                                      variant: 'danger',
                                      onClick: () => handleDeleteClick(material),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Strip */}
          <div className="p-3 border-top d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="text-muted small">
              Showing{' '}
              <strong>
                {totalRecords > 0 ? (currentPage - 1) * perPage + 1 : 0}
              </strong>{' '}
              to{' '}
              <strong>
                {Math.min(currentPage * perPage, totalRecords)}
              </strong>{' '}
              of <strong>{totalRecords}</strong> entries
            </div>

            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, idx) => (
                  <li
                    key={idx + 1}
                    className={`page-item ${currentPage === idx + 1 ? 'active' : ''}`}
                  >
                    <button
                      className="page-link"
                      type="button"
                      onClick={() => handlePageChange(idx + 1)}
                    >
                      {idx + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
      {/* /Study Material List Table Card */}

      {/* View Material Modal */}
      {viewMaterial && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white py-3">
                <div>
                  <h5 className="modal-title text-white fw-bold">
                    <i className="ti ti-file-text me-2 text-warning"></i>
                    {viewMaterial.title}
                  </h5>
                  <p className="text-white-50 small mb-0">
                    Type: {viewMaterial.material_type_name} | Subject: {viewMaterial.subject_name}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setViewMaterial(null)}
                ></button>
              </div>
              <div className="modal-body p-4 bg-light">
                <div className="card shadow-sm border-0 mb-3 bg-white">
                  <div className="card-body p-3">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <span className="text-muted small d-block">Class & Section</span>
                        <strong className="text-dark fs-14">
                          Class {viewMaterial.class_name}
                          {viewMaterial.section_name ? ` (${viewMaterial.section_name})` : ''}
                        </strong>
                      </div>
                      <div className="col-md-6">
                        <span className="text-muted small d-block">Topic / Chapter</span>
                        <strong className="text-dark fs-14">
                          {viewMaterial.chapter || 'N/A'}
                        </strong>
                      </div>
                      <div className="col-md-6">
                        <span className="text-muted small d-block">Uploaded By</span>
                        <strong className="text-dark fs-14">
                          {viewMaterial.uploaded_by_name} ({viewMaterial.uploader_type})
                        </strong>
                      </div>
                      <div className="col-md-6">
                        <span className="text-muted small d-block">Status</span>
                        {Number(viewMaterial.status) === 1 ? (
                          <span className="badge bg-success text-white">Active</span>
                        ) : (
                          <span className="badge bg-danger text-white">Inactive</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {viewMaterial.description && (
                  <div className="card shadow-sm border-0 mb-3 bg-white">
                    <div className="card-header bg-white py-2 border-bottom">
                      <h6 className="mb-0 fw-bold text-dark">Description</h6>
                    </div>
                    <div className="card-body p-3">
                      <p className="mb-0 text-muted">{viewMaterial.description}</p>
                    </div>
                  </div>
                )}

                {viewMaterial.attachment && (
                  <div className="card shadow-sm border-0 bg-white">
                    <div className="card-header bg-white py-2 border-bottom">
                      <h6 className="mb-0 fw-bold text-dark">Attached Document</h6>
                    </div>
                    <div className="card-body p-3 d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-2">
                        <i className="ti ti-file-type-pdf text-danger fs-32"></i>
                        <div>
                          <strong className="d-block text-dark">
                            {viewMaterial.attachment_original_name || 'document.pdf'}
                          </strong>
                          <span className="text-muted small">
                            Size: {formatFileSize(viewMaterial.attachment_size || 24000)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDownloadAttachment(e, viewMaterial)}
                        className="btn btn-primary btn-sm d-flex align-items-center border-0"
                      >
                        <i className="ti ti-download me-1"></i> Download File
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer bg-white py-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm px-4"
                  onClick={() => setViewMaterial(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Material Modal */}
      {showAddEditModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header py-3 px-4 border-bottom">
                <h5 className="modal-title text-dark fw-bold">
                  <i className="ti ti-square-rounded-plus me-2 text-primary"></i>
                  {editingMaterial ? 'Edit Study Material' : 'Add Study Material'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddEditModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSaveMaterial}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-12">
                      <label className="form-label fw-semibold">
                        Material Title <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Mathematics (Volume 1) | competency‐based"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Academic Year</label>
                      <select
                        className="form-select"
                        value={formData.academic_year_id}
                        onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
                      >
                        {academicYears.length > 0 ? (
                          academicYears.map((ay) => (
                            <option key={ay.id} value={ay.id}>
                              {ay.academic_year || ay.year}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="1">2025</option>
                            <option value="2">2026</option>
                            <option value="3">2027</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Material Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={formData.material_type_id}
                        onChange={(e) => setFormData({ ...formData, material_type_id: e.target.value })}
                        required
                      >
                        {materialTypes.map((mt) => (
                          <option key={mt.id} value={mt.id}>
                            {mt.material_type_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Class <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={formData.class_id}
                        onChange={(e) => handleModalClassChange(e.target.value)}
                        required
                      >
                        <option value="">-- Select Class --</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.class_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Section</label>
                      <select
                        className="form-select"
                        value={formData.section_id}
                        onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                      >
                        <option value="">All Sections</option>
                        {formSections.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.section_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">
                        Subject <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={formData.subject_id}
                        onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                        required
                      >
                        <option value="">-- Select Subject --</option>
                        {formSubjects.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.subject_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-12">
                      <label className="form-label fw-semibold">Topic / Chapter</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Chapter 1: Introduction"
                        value={formData.chapter}
                        onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                      />
                    </div>

                    <div className="col-md-12">
                      <label className="form-label fw-semibold">Description</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Detailed overview of the study material..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      ></textarea>
                    </div>

                    <div className="col-md-8">
                      <label className="form-label fw-semibold">Upload Attachment (Optional)</label>
                      <input
                        type="file"
                        className="form-control"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const f = e.target.files[0];
                            setModalFile(f);
                            setFormData((prev) => ({ ...prev, attachment_name: f.name }));
                          }
                        }}
                      />
                      {(modalFile || formData.attachment_name || formData.attachment_url) && (
                        <div className="d-flex align-items-center justify-content-between mt-1 text-xs text-muted">
                          <span>
                            Selected: <strong>{modalFile ? modalFile.name : formData.attachment_name}</strong>
                          </span>
                          <button
                            type="button"
                            className="btn btn-link btn-xs text-danger p-0 ms-2 text-decoration-none"
                            onClick={() => {
                              setModalFile(null);
                              setFormData((prev) => ({ ...prev, attachment_name: '', attachment_url: '' }));
                            }}
                          >
                            <i className="ti ti-x me-1"></i>Remove
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Status</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
                      >
                        <option value={1}>Active</option>
                        <option value={2}>Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light py-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm px-3"
                    onClick={() => setShowAddEditModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm px-4"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : editingMaterial ? 'Save Changes' : 'Create Material'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Manage Material Types Modal */}
      {showTypesModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-dark text-white py-3">
                <h5 className="modal-title text-white fw-bold">
                  <i className="ti ti-folders me-2 text-warning"></i>
                  Manage Material Types
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowTypesModal(false);
                    setEditingTypeId(null);
                    setNewTypeName('');
                    setNewTypeDesc('');
                  }}
                ></button>
              </div>
              <div className="modal-body p-4">
                {/* Add/Edit Form */}
                <form onSubmit={handleSaveMaterialType} className="mb-4 p-3 bg-light rounded border">
                  <h6 className="fw-bold text-dark mb-2">
                    {editingTypeId ? 'Edit Material Type' : 'Add New Material Type'}
                  </h6>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Material Type Name (e.g. Syllabus)"
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Description (optional)"
                        value={newTypeDesc}
                        onChange={(e) => setNewTypeDesc(e.target.value)}
                      />
                    </div>
                    <div className="col-12 text-end">
                      {editingTypeId && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm me-2"
                          onClick={() => {
                            setEditingTypeId(null);
                            setNewTypeName('');
                            setNewTypeDesc('');
                          }}
                        >
                          Cancel
                        </button>
                      )}
                      <button type="submit" className="btn btn-primary btn-sm px-3">
                        {editingTypeId ? 'Update Type' : 'Add Type'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* List of Types */}
                <h6 className="fw-bold text-dark mb-2">Existing Material Types ({materialTypes.length})</h6>
                <div className="list-group">
                  {materialTypes.map((t) => (
                    <div
                      key={t.id}
                      className="list-group-item d-flex align-items-center justify-content-between p-2.5"
                    >
                      <div>
                        <strong className="text-dark fs-14">{t.material_type_name}</strong>
                        {t.description && (
                          <span className="text-muted small d-block">{t.description}</span>
                        )}
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-icon btn-sm btn-light text-warning border-0"
                          title="Edit"
                          onClick={() => {
                            setEditingTypeId(t.id);
                            setNewTypeName(t.material_type_name);
                            setNewTypeDesc(t.description || '');
                          }}
                        >
                          <i className="ti ti-pencil"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-icon btn-sm btn-light text-danger border-0"
                          title="Delete"
                          onClick={() => handleDeleteMaterialType(t.id)}
                        >
                          <i className="ti ti-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer bg-white py-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm px-4"
                  onClick={() => {
                    setShowTypesModal(false);
                    setEditingTypeId(null);
                    setNewTypeName('');
                    setNewTypeDesc('');
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow-lg text-center p-4">
              <div
                className="avatar avatar-xl bg-danger-subtle text-danger rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{ width: '56px', height: '56px' }}
              >
                <i className="ti ti-trash fs-24"></i>
              </div>
              <h5 className="fw-bold text-dark mb-1">Delete Study Material?</h5>
              <p className="text-muted small mb-4">
                Are you sure you want to delete this study material record? This action cannot be undone.
              </p>
              <div className="d-flex justify-content-center gap-2">
                <button
                  type="button"
                  className="btn btn-light btn-sm px-3"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingId(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm px-4"
                  onClick={handleConfirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyMaterialsList;
