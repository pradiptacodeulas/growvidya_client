import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  getReligionsApi,
  createReligionApi,
  updateReligionApi,
  deleteReligionApi,
  getMotherTonguesApi,
  createMotherTongueApi,
  updateMotherTongueApi,
  deleteMotherTongueApi,
  getGendersApi,
  getCategoriesApi,
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
} from '../../../api/adminMiscSetting.api';
import TableActionMenu from '../../../components/common/TableActionMenu';

const MiscManagement = () => {
  // ==================== RELIGION STATE ====================
  const [religions, setReligions] = useState([]);
  const [religionTotal, setReligionTotal] = useState(0);
  const [religionPage, setReligionPage] = useState(1);
  const [religionLimit, setReligionLimit] = useState(10);
  const [religionSearch, setReligionSearch] = useState('');
  const [religionLoading, setReligionLoading] = useState(false);

  // Religion Modal
  const [showReligionModal, setShowReligionModal] = useState(false);
  const [religionEditItem, setReligionEditItem] = useState(null);
  const [religionFormData, setReligionFormData] = useState({ religion: '', sort_order: 1, status: 1 });
  const [submittingReligion, setSubmittingReligion] = useState(false);

  // ==================== MOTHER TONGUE STATE ====================
  const [motherTongues, setMotherTongues] = useState([]);
  const [tongueTotal, setTongueTotal] = useState(0);
  const [tonguePage, setTonguePage] = useState(1);
  const [tongueLimit, setTongueLimit] = useState(10);
  const [tongueSearch, setTongueSearch] = useState('');
  const [tongueLoading, setTongueLoading] = useState(false);

  // Mother Tongue Modal
  const [showTongueModal, setShowTongueModal] = useState(false);
  const [tongueEditItem, setTongueEditItem] = useState(null);
  const [tongueFormData, setTongueFormData] = useState({ mother_tongue: '', sort_order: 1, status: 1 });
  const [submittingTongue, setSubmittingTongue] = useState(false);

  // ==================== GENDER STATE ====================
  const [genders, setGenders] = useState([]);
  const [genderTotal, setGenderTotal] = useState(0);
  const [genderPage, setGenderPage] = useState(1);
  const [genderLimit, setGenderLimit] = useState(10);
  const [genderSearch, setGenderSearch] = useState('');
  const [genderLoading, setGenderLoading] = useState(false);

  // ==================== CATEGORY STATE ====================
  const [categories, setCategories] = useState([]);
  const [categoryTotal, setCategoryTotal] = useState(0);
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryLimit, setCategoryLimit] = useState(10);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);

  // Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryEditItem, setCategoryEditItem] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({ category: '', sort_order: 1, status: 1 });
  const [submittingCategory, setSubmittingCategory] = useState(false);

  // ==================== DELETE CONFIRMATION MODAL ====================
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ type: '', id: null, name: '' });
  const [deleting, setDeleting] = useState(false);

  // Active open action dropdown row ID per table
  const [activeReligionDropdown, setActiveReligionDropdown] = useState(null);
  const [activeTongueDropdown, setActiveTongueDropdown] = useState(null);
  const [activeCategoryDropdown, setActiveCategoryDropdown] = useState(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.action-dropdown-container')) {
        setActiveReligionDropdown(null);
        setActiveTongueDropdown(null);
        setActiveCategoryDropdown(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // ==================== FETCH HANDLERS ====================

  const fetchReligions = async () => {
    try {
      setReligionLoading(true);
      const res = await getReligionsApi({
        page: religionPage,
        limit: religionLimit,
        search: religionSearch,
      });
      if (res && res.data) {
        setReligions(res.data.religions || []);
        setReligionTotal(res.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error fetching religions:', err);
    } finally {
      setReligionLoading(false);
    }
  };

  const fetchMotherTongues = async () => {
    try {
      setTongueLoading(true);
      const res = await getMotherTonguesApi({
        page: tonguePage,
        limit: tongueLimit,
        search: tongueSearch,
      });
      if (res && res.data) {
        setMotherTongues(res.data.motherTongues || []);
        setTongueTotal(res.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error fetching mother tongues:', err);
    } finally {
      setTongueLoading(false);
    }
  };

  const fetchGenders = async () => {
    try {
      setGenderLoading(true);
      const res = await getGendersApi({
        page: genderPage,
        limit: genderLimit,
        search: genderSearch,
      });
      if (res && res.data) {
        setGenders(res.data.genders || []);
        setGenderTotal(res.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error fetching genders:', err);
    } finally {
      setGenderLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoryLoading(true);
      const res = await getCategoriesApi({
        page: categoryPage,
        limit: categoryLimit,
        search: categorySearch,
      });
      if (res && res.data) {
        setCategories(res.data.categories || []);
        setCategoryTotal(res.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setCategoryLoading(false);
    }
  };

  useEffect(() => {
    fetchReligions();
  }, [religionPage, religionLimit, religionSearch]);

  useEffect(() => {
    fetchMotherTongues();
  }, [tonguePage, tongueLimit, tongueSearch]);

  useEffect(() => {
    fetchGenders();
  }, [genderPage, genderLimit, genderSearch]);

  useEffect(() => {
    fetchCategories();
  }, [categoryPage, categoryLimit, categorySearch]);

  // ==================== RELIGION CRUD ====================

  const handleOpenAddReligion = () => {
    setReligionEditItem(null);
    setReligionFormData({ religion: '', sort_order: (religions.length + 1) || 1, status: 1 });
    setShowReligionModal(true);
  };

  const handleEditReligion = (item) => {
    setActiveReligionDropdown(null);
    setReligionEditItem(item);
    setReligionFormData({
      religion: item.religion,
      sort_order: item.sort_order || 1,
      status: Number(item.status) === 1 ? 1 : 2,
    });
    setShowReligionModal(true);
  };

  const handleSaveReligion = async (e) => {
    e.preventDefault();
    if (!religionFormData.religion.trim()) {
      toast.error('Please enter religion name.');
      return;
    }
    try {
      setSubmittingReligion(true);
      if (religionEditItem) {
        await updateReligionApi(religionEditItem.id, religionFormData);
        toast.success('Religion updated successfully.');
      } else {
        await createReligionApi(religionFormData);
        toast.success('Religion added successfully.');
      }
      setShowReligionModal(false);
      fetchReligions();
    } catch (err) {
      console.error('Error saving religion:', err);
      toast.error(err.response?.data?.message || 'Failed to save religion.');
    } finally {
      setSubmittingReligion(false);
    }
  };

  // ==================== MOTHER TONGUE CRUD ====================

  const handleOpenAddTongue = () => {
    setTongueEditItem(null);
    setTongueFormData({ mother_tongue: '', sort_order: (motherTongues.length + 1) || 1, status: 1 });
    setShowTongueModal(true);
  };

  const handleEditTongue = (item) => {
    setActiveTongueDropdown(null);
    setTongueEditItem(item);
    setTongueFormData({
      mother_tongue: item.mother_tongue,
      sort_order: item.sort_order || 1,
      status: Number(item.status) === 1 ? 1 : 2,
    });
    setShowTongueModal(true);
  };

  const handleSaveTongue = async (e) => {
    e.preventDefault();
    if (!tongueFormData.mother_tongue.trim()) {
      toast.error('Please enter mother tongue name.');
      return;
    }
    try {
      setSubmittingTongue(true);
      if (tongueEditItem) {
        await updateMotherTongueApi(tongueEditItem.id, tongueFormData);
        toast.success('Mother tongue updated successfully.');
      } else {
        await createMotherTongueApi(tongueFormData);
        toast.success('Mother tongue added successfully.');
      }
      setShowTongueModal(false);
      fetchMotherTongues();
    } catch (err) {
      console.error('Error saving mother tongue:', err);
      toast.error(err.response?.data?.message || 'Failed to save mother tongue.');
    } finally {
      setSubmittingTongue(false);
    }
  };

  // ==================== CATEGORY CRUD ====================

  const handleOpenAddCategory = () => {
    setCategoryEditItem(null);
    setCategoryFormData({ category: '', sort_order: (categories.length + 1) || 1, status: 1 });
    setShowCategoryModal(true);
  };

  const handleEditCategory = (item) => {
    setActiveCategoryDropdown(null);
    setCategoryEditItem(item);
    setCategoryFormData({
      category: item.category,
      sort_order: item.sort_order || 1,
      status: Number(item.status) === 1 ? 1 : 2,
    });
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryFormData.category.trim()) {
      toast.error('Please enter category name.');
      return;
    }
    try {
      setSubmittingCategory(true);
      if (categoryEditItem) {
        await updateCategoryApi(categoryEditItem.id, categoryFormData);
        toast.success('Category updated successfully.');
      } else {
        await createCategoryApi(categoryFormData);
        toast.success('Category added successfully.');
      }
      setShowCategoryModal(false);
      fetchCategories();
    } catch (err) {
      console.error('Error saving category:', err);
      toast.error(err.response?.data?.message || 'Failed to save category.');
    } finally {
      setSubmittingCategory(false);
    }
  };

  // ==================== DELETE ACTION ====================

  const confirmDelete = (type, item) => {
    setActiveReligionDropdown(null);
    setActiveTongueDropdown(null);
    setActiveCategoryDropdown(null);
    setDeleteTarget({
      type,
      id: item.id,
      name: item.religion || item.mother_tongue || item.category || 'this item',
    });
    setShowDeleteModal(true);
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget.id) return;
    try {
      setDeleting(true);
      if (deleteTarget.type === 'religion') {
        await deleteReligionApi(deleteTarget.id);
        toast.success('Religion deleted successfully.');
        fetchReligions();
      } else if (deleteTarget.type === 'mother_tongue') {
        await deleteMotherTongueApi(deleteTarget.id);
        toast.success('Mother tongue deleted successfully.');
        fetchMotherTongues();
      } else if (deleteTarget.type === 'category') {
        await deleteCategoryApi(deleteTarget.id);
        toast.success('Category deleted successfully.');
        fetchCategories();
      }
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Error deleting item:', err);
      toast.error(err.response?.data?.message || 'Failed to delete item.');
    } finally {
      setDeleting(false);
    }
  };

  // Helper for pagination numbers
  const renderPagination = (currentPage, totalItems, pageSize, onPageChange, idPrefix) => {
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    return (
      <div className="row align-items-center mt-3 g-2">
        <div className="col-12 col-md-5 text-center text-md-start">
          <div className="dataTables_info fs-12 text-muted" role="status" aria-live="polite">
            Showing {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems} entries
          </div>
        </div>
        <div className="col-12 col-md-7">
          <div className="dataTables_paginate paging_simple_numbers d-flex justify-content-center justify-content-md-end" id={`${idPrefix}_paginate`}>
            <ul className="pagination pagination-sm mb-0 flex-wrap justify-content-center">
              <li className={`paginate_button page-item previous ${currentPage <= 1 ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Prev
                </button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <li key={p} className={`paginate_button page-item ${p === currentPage ? 'active' : ''}`}>
                  <button type="button" className="page-link" onClick={() => onPageChange(p)}>
                    {p}
                  </button>
                </li>
              ))}
              <li className={`paginate_button page-item next ${currentPage >= totalPages ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="page-header mb-4">
        <div className="row">
          <div className="col">
            <h3 className="page-title text-dark fw-bold">Misc Management</h3>
          </div>
        </div>
      </div>
      {/* /Page Header */}

      {/* ROW 1: RELIGION & MOTHER TONGUE */}
      <div className="row">
        {/* RELIGION CARD */}
        <div className="col-lg-6 mb-4">
          <div className="card h-100 shadow-sm border-0">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="card-title mb-0 text-dark fw-bold">Religion</h5>
              <button
                type="button"
                className="btn btn-primary btn-sm rounded-1 d-inline-flex align-items-center"
                onClick={handleOpenAddReligion}
              >
                <i className="ti ti-square-rounded-plus me-2 fs-16"></i>Add Religion
              </button>
            </div>

            <div className="card-body">
              <div id="religionTable_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer">
                <div className="row mb-3 align-items-center g-2">
                  <div className="col-12 col-sm-6">
                    <div className="dataTables_length" id="religionTable_length">
                      <label className="d-flex align-items-center gap-1 fs-13 text-muted flex-wrap">
                        Row Per Page
                        <select
                          name="religionTable_length"
                          className="form-select form-select-sm d-inline-block w-auto ms-1 me-1"
                          value={religionLimit}
                          onChange={(e) => {
                            setReligionLimit(Number(e.target.value));
                            setReligionPage(1);
                          }}
                        >
                          <option value="10">10</option>
                          <option value="25">25</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                        Entries
                      </label>
                    </div>
                  </div>
                  <div className="col-12 col-sm-6 text-sm-end">
                    <div id="religionTable_filter" className="dataTables_filter">
                      <label className="d-inline-flex align-items-center gap-1 w-100 justify-content-sm-end">
                        <input
                          type="search"
                          className="form-control form-control-sm"
                          placeholder="Search"
                          value={religionSearch}
                          onChange={(e) => {
                            setReligionSearch(e.target.value);
                            setReligionPage(1);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="row dt-row">
                  <div className="col-12">
                    <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', minHeight: '180px' }}>
                      <table className="table datatable table-striped align-middle mb-0 dataTable no-footer w-100" id="religionTable" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th className="text-center text-nowrap" style={{ minWidth: '60px', width: '15%' }}>Sl No.</th>
                            <th className="text-center text-nowrap" style={{ minWidth: '130px', width: '35%' }}>Religion</th>
                            <th className="text-center text-nowrap" style={{ minWidth: '90px', width: '20%' }}>Sort Order</th>
                            <th className="text-center text-nowrap" style={{ minWidth: '90px', width: '15%' }}>Status</th>
                            <th className="text-center text-nowrap" style={{ minWidth: '70px', width: '15%' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {religionLoading ? (
                            <tr>
                              <td colSpan="5" className="text-center py-4 text-muted">
                                <span className="spinner-border spinner-border-sm me-2"></span>Loading religions...
                              </td>
                            </tr>
                          ) : religions.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="text-center py-4 text-muted">No religion records found</td>
                            </tr>
                          ) : (
                            religions.map((item, idx) => (
                              <tr key={item.id} id={`religionTableRow_${item.id}`} className={idx % 2 === 0 ? 'odd' : 'even'}>
                                <td className="text-center text-nowrap">{(religionPage - 1) * religionLimit + idx + 1}</td>
                                <td className="text-center fw-medium text-dark" id={`religion_${item.id}`}>{item.religion}</td>
                                <td className="text-center text-nowrap" id={`sort_order_${item.id}`}>{item.sort_order}</td>
                                <td className="text-center text-nowrap" id={`status_${item.id}`}>
                                  {Number(item.status) === 1 ? (
                                    <span className="text-success fw-medium">Active</span>
                                  ) : (
                                    <span className="text-danger fw-medium">Inactive</span>
                                  )}
                                </td>
                                <td className="text-center text-nowrap">
                                  <TableActionMenu
                                    items={[
                                      {
                                        label: 'Edit',
                                        icon: 'ti ti-edit-circle text-primary',
                                        onClick: () => handleEditReligion(item),
                                      },
                                      {
                                        label: 'Delete',
                                        icon: 'ti ti-trash-x',
                                        variant: 'danger',
                                        onClick: () => confirmDelete('religion', item),
                                      },
                                    ]}
                                  />
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {renderPagination(religionPage, religionTotal, religionLimit, setReligionPage, 'religionTable')}
              </div>
            </div>
          </div>
        </div>

        {/* MOTHER TONGUE CARD */}
        <div className="col-lg-6 mb-4">
          <div className="card h-100 shadow-sm border-0">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="card-title mb-0 text-dark fw-bold">Mother Tongue</h5>
              <button
                type="button"
                className="btn btn-primary btn-sm rounded-1 d-inline-flex align-items-center"
                onClick={handleOpenAddTongue}
              >
                <i className="ti ti-square-rounded-plus me-2 fs-16"></i>Add Mother Tongue
              </button>
            </div>

            <div className="card-body">
              <div id="motherTongueTable_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer">
                <div className="row mb-3 align-items-center g-2">
                  <div className="col-12 col-sm-6">
                    <div className="dataTables_length" id="motherTongueTable_length">
                      <label className="d-flex align-items-center gap-1 fs-13 text-muted flex-wrap">
                        Row Per Page
                        <select
                          name="motherTongueTable_length"
                          className="form-select form-select-sm d-inline-block w-auto ms-1 me-1"
                          value={tongueLimit}
                          onChange={(e) => {
                            setTongueLimit(Number(e.target.value));
                            setTonguePage(1);
                          }}
                        >
                          <option value="10">10</option>
                          <option value="25">25</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                        Entries
                      </label>
                    </div>
                  </div>
                  <div className="col-12 col-sm-6 text-sm-end">
                    <div id="motherTongueTable_filter" className="dataTables_filter">
                      <label className="d-inline-flex align-items-center gap-1 w-100 justify-content-sm-end">
                        <input
                          type="search"
                          className="form-control form-control-sm"
                          placeholder="Search"
                          value={tongueSearch}
                          onChange={(e) => {
                            setTongueSearch(e.target.value);
                            setTonguePage(1);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="row dt-row">
                  <div className="col-12">
                    <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', minHeight: '180px' }}>
                      <table className="table datatable table-striped align-middle mb-0 dataTable no-footer w-100" id="motherTongueTable" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th className="text-center text-nowrap" style={{ minWidth: '60px', width: '15%' }}>Sl No.</th>
                            <th className="text-center text-nowrap" style={{ minWidth: '130px', width: '35%' }}>Mother Tongue</th>
                            <th className="text-center text-nowrap" style={{ minWidth: '90px', width: '20%' }}>Sort Order</th>
                            <th className="text-center text-nowrap" style={{ minWidth: '90px', width: '15%' }}>Status</th>
                            <th className="text-center text-nowrap" style={{ minWidth: '70px', width: '15%' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tongueLoading ? (
                            <tr>
                              <td colSpan="5" className="text-center py-4 text-muted">
                                <span className="spinner-border spinner-border-sm me-2"></span>Loading mother tongues...
                              </td>
                            </tr>
                          ) : motherTongues.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="text-center py-4 text-muted">No mother tongue records found</td>
                            </tr>
                          ) : (
                            motherTongues.map((item, idx) => (
                              <tr key={item.id} id={`motherTongueTablerow_${item.id}`} className={idx % 2 === 0 ? 'odd' : 'even'}>
                                <td className="text-center text-nowrap">{(tonguePage - 1) * tongueLimit + idx + 1}</td>
                                <td className="text-center fw-medium text-dark" id={`mother_tongue_${item.id}`}>{item.mother_tongue}</td>
                                <td className="text-center text-nowrap" id={`sort_order_tongue_${item.id}`}>{item.sort_order}</td>
                                <td className="text-center text-nowrap" id={`status_tongue_${item.id}`}>
                                  {Number(item.status) === 1 ? (
                                    <span className="text-success fw-medium">Active</span>
                                  ) : (
                                    <span className="text-danger fw-medium">Inactive</span>
                                  )}
                                </td>
                                <td className="text-center text-nowrap">
                                  <TableActionMenu
                                    items={[
                                      {
                                        label: 'Edit',
                                        icon: 'ti ti-edit-circle text-primary',
                                        onClick: () => handleEditTongue(item),
                                      },
                                      {
                                        label: 'Delete',
                                        icon: 'ti ti-trash-x',
                                        variant: 'danger',
                                        onClick: () => confirmDelete('mother_tongue', item),
                                      },
                                    ]}
                                  />
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {renderPagination(tonguePage, tongueTotal, tongueLimit, setTonguePage, 'motherTongueTable')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: GENDER & CATEGORY */}
      <div className="row">
        {/* GENDER CARD */}
        <div className="col-lg-6 mb-4">
          <div className="card h-100 shadow-sm border-0">
            <div className="card-header">
              <h5 className="card-title mb-0 text-dark fw-bold">Gender</h5>
            </div>

            <div className="card-body">
              <div id="DataTables_Table_0_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer">
                <div className="row mb-3 align-items-center g-2">
                  <div className="col-12 col-sm-6">
                    <div className="dataTables_length" id="DataTables_Table_0_length">
                      <label className="d-flex align-items-center gap-1 fs-13 text-muted flex-wrap">
                        Row Per Page
                        <select
                          name="DataTables_Table_0_length"
                          className="form-select form-select-sm d-inline-block w-auto ms-1 me-1"
                          value={genderLimit}
                          onChange={(e) => {
                            setGenderLimit(Number(e.target.value));
                            setGenderPage(1);
                          }}
                        >
                          <option value="10">10</option>
                          <option value="25">25</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                        Entries
                      </label>
                    </div>
                  </div>
                  <div className="col-12 col-sm-6 text-sm-end">
                    <div id="DataTables_Table_0_filter" className="dataTables_filter">
                      <label className="d-inline-flex align-items-center gap-1 w-100 justify-content-sm-end">
                        <input
                          type="search"
                          className="form-control form-control-sm"
                          placeholder="Search"
                          value={genderSearch}
                          onChange={(e) => {
                            setGenderSearch(e.target.value);
                            setGenderPage(1);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="row dt-row">
                  <div className="col-12">
                    <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', minHeight: '180px' }}>
                      <table className="table datatable table-striped align-middle mb-0 dataTable no-footer w-100" id="DataTables_Table_0" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th className="text-center text-nowrap" style={{ minWidth: '80px', width: '30%' }}>Sl No.</th>
                            <th className="text-center text-nowrap" style={{ minWidth: '150px', width: '70%' }}>Gender</th>
                          </tr>
                        </thead>
                        <tbody>
                          {genderLoading ? (
                            <tr>
                              <td colSpan="2" className="text-center py-4 text-muted">
                                <span className="spinner-border spinner-border-sm me-2"></span>Loading genders...
                              </td>
                            </tr>
                          ) : genders.length === 0 ? (
                            <tr>
                              <td colSpan="2" className="text-center py-4 text-muted">No gender records found</td>
                            </tr>
                          ) : (
                            genders.map((item, idx) => (
                              <tr key={item.id} className={idx % 2 === 0 ? 'odd' : 'even'}>
                                <td className="text-center text-nowrap">{(genderPage - 1) * genderLimit + idx + 1}</td>
                                <td className="text-center fw-medium text-dark">{item.gender}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {renderPagination(genderPage, genderTotal, genderLimit, setGenderPage, 'DataTables_Table_0')}
              </div>
            </div>
          </div>
        </div>

        {/* CATEGORY CARD */}
        <div className="col-lg-6 mb-4">
          <div className="card h-100 shadow-sm border-0">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="card-title mb-0 text-dark fw-bold">Category</h5>
              <button
                type="button"
                className="btn btn-primary btn-sm rounded-1 d-inline-flex align-items-center"
                onClick={handleOpenAddCategory}
              >
                <i className="ti ti-square-rounded-plus me-2 fs-16"></i>Add Category
              </button>
            </div>

            <div className="card-body">
              <div id="categoryTable_wrapper" className="dataTables_wrapper dt-bootstrap5 no-footer">
                <div className="row mb-3 align-items-center g-2">
                  <div className="col-12 col-sm-6">
                    <div className="dataTables_length" id="categoryTable_length">
                      <label className="d-flex align-items-center gap-1 fs-13 text-muted flex-wrap">
                        Row Per Page
                        <select
                          name="categoryTable_length"
                          className="form-select form-select-sm d-inline-block w-auto ms-1 me-1"
                          value={categoryLimit}
                          onChange={(e) => {
                            setCategoryLimit(Number(e.target.value));
                            setCategoryPage(1);
                          }}
                        >
                          <option value="10">10</option>
                          <option value="25">25</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                        Entries
                      </label>
                    </div>
                  </div>
                  <div className="col-12 col-sm-6 text-sm-end">
                    <div id="categoryTable_filter" className="dataTables_filter">
                      <label className="d-inline-flex align-items-center gap-1 w-100 justify-content-sm-end">
                        <input
                          type="search"
                          className="form-control form-control-sm"
                          placeholder="Search"
                          value={categorySearch}
                          onChange={(e) => {
                            setCategorySearch(e.target.value);
                            setCategoryPage(1);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="row dt-row">
                  <div className="col-12">
                    <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', minHeight: '180px' }}>
                      <table className="table datatable table-striped align-middle mb-0 dataTable no-footer w-100" id="categoryTable" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th className="text-center text-nowrap" style={{ minWidth: '60px', width: '15%' }}>Sl No.</th>
                            <th className="text-center text-nowrap" style={{ minWidth: '130px', width: '35%' }}>Category</th>
                            <th className="text-center text-nowrap" style={{ minWidth: '90px', width: '20%' }}>Sort Order</th>
                            <th className="text-center text-nowrap" style={{ minWidth: '90px', width: '15%' }}>Status</th>
                            <th className="text-center text-nowrap" style={{ minWidth: '70px', width: '15%' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryLoading ? (
                            <tr>
                              <td colSpan="5" className="text-center py-4 text-muted">
                                <span className="spinner-border spinner-border-sm me-2"></span>Loading categories...
                              </td>
                            </tr>
                          ) : categories.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="text-center py-4 text-muted">No category records found</td>
                            </tr>
                          ) : (
                            categories.map((item, idx) => (
                              <tr key={item.id} id={`categoryTableRow_${item.id}`} className={idx % 2 === 0 ? 'odd' : 'even'}>
                                <td className="text-center text-nowrap">{(categoryPage - 1) * categoryLimit + idx + 1}</td>
                                <td className="text-center fw-medium text-dark" id={`category_${item.id}`}>{item.category}</td>
                                <td className="text-center text-nowrap" id={`sort_order_cat_${item.id}`}>{item.sort_order}</td>
                                <td className="text-center text-nowrap" id={`status_cat_${item.id}`}>
                                  {Number(item.status) === 1 ? (
                                    <span className="text-success fw-medium">Active</span>
                                  ) : (
                                    <span className="text-danger fw-medium">Inactive</span>
                                  )}
                                </td>
                                <td className="text-center text-nowrap">
                                  <TableActionMenu
                                    items={[
                                      {
                                        label: 'Edit',
                                        icon: 'ti ti-edit-circle text-primary',
                                        onClick: () => handleEditCategory(item),
                                      },
                                      {
                                        label: 'Delete',
                                        icon: 'ti ti-trash-x',
                                        variant: 'danger',
                                        onClick: () => confirmDelete('category', item),
                                      },
                                    ]}
                                  />
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {renderPagination(categoryPage, categoryTotal, categoryLimit, setCategoryPage, 'categoryTable')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== RELIGION MODAL ==================== */}
      <Modal show={showReligionModal} onHide={() => setShowReligionModal(false)} centered>
        <form onSubmit={handleSaveReligion}>
          <Modal.Header closeButton>
            <Modal.Title className="fs-16 fw-bold text-dark">
              {religionEditItem ? 'Edit Religion' : 'Add Religion'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-dark fw-medium fs-13">
                Religion Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Hinduism, Islam, Christianity"
                value={religionFormData.religion}
                onChange={(e) => setReligionFormData({ ...religionFormData, religion: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-dark fw-medium fs-13">Sort Order</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={religionFormData.sort_order}
                onChange={(e) => setReligionFormData({ ...religionFormData, sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-dark fw-medium fs-13">Status</label>
              <select
                className="form-select"
                value={religionFormData.status}
                onChange={(e) => setReligionFormData({ ...religionFormData, status: Number(e.target.value) })}
              >
                <option value={1}>Active</option>
                <option value={2}>Inactive</option>
              </select>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-light btn-sm" onClick={() => setShowReligionModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submittingReligion}>
              {submittingReligion ? 'Saving...' : religionEditItem ? 'Save Changes' : 'Add Religion'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* ==================== MOTHER TONGUE MODAL ==================== */}
      <Modal show={showTongueModal} onHide={() => setShowTongueModal(false)} centered>
        <form onSubmit={handleSaveTongue}>
          <Modal.Header closeButton>
            <Modal.Title className="fs-16 fw-bold text-dark">
              {tongueEditItem ? 'Edit Mother Tongue' : 'Add Mother Tongue'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-dark fw-medium fs-13">
                Mother Tongue Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Bengali, English, Hindi"
                value={tongueFormData.mother_tongue}
                onChange={(e) => setTongueFormData({ ...tongueFormData, mother_tongue: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-dark fw-medium fs-13">Sort Order</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={tongueFormData.sort_order}
                onChange={(e) => setTongueFormData({ ...tongueFormData, sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-dark fw-medium fs-13">Status</label>
              <select
                className="form-select"
                value={tongueFormData.status}
                onChange={(e) => setTongueFormData({ ...tongueFormData, status: Number(e.target.value) })}
              >
                <option value={1}>Active</option>
                <option value={2}>Inactive</option>
              </select>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-light btn-sm" onClick={() => setShowTongueModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submittingTongue}>
              {submittingTongue ? 'Saving...' : tongueEditItem ? 'Save Changes' : 'Add Mother Tongue'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* ==================== CATEGORY MODAL ==================== */}
      <Modal show={showCategoryModal} onHide={() => setShowCategoryModal(false)} centered>
        <form onSubmit={handleSaveCategory}>
          <Modal.Header closeButton>
            <Modal.Title className="fs-16 fw-bold text-dark">
              {categoryEditItem ? 'Edit Category' : 'Add Category'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-dark fw-medium fs-13">
                Category Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. General, SC, ST, OBC"
                value={categoryFormData.category}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, category: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-dark fw-medium fs-13">Sort Order</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={categoryFormData.sort_order}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, sort_order: Number(e.target.value) })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-dark fw-medium fs-13">Status</label>
              <select
                className="form-select"
                value={categoryFormData.status}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, status: Number(e.target.value) })}
              >
                <option value={1}>Active</option>
                <option value={2}>Inactive</option>
              </select>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-light btn-sm" onClick={() => setShowCategoryModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submittingCategory}>
              {submittingCategory ? 'Saving...' : categoryEditItem ? 'Save Changes' : 'Add Category'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered size="sm">
        <Modal.Body className="text-center py-4">
          <i className="ti ti-alert-triangle text-danger fs-48 d-block mb-3"></i>
          <h5 className="text-dark fw-bold mb-2">Delete Confirmation</h5>
          <p className="text-muted fs-13 mb-4">
            Are you sure you want to delete <strong className="text-dark">{deleteTarget.name}</strong>? This action cannot be undone.
          </p>
          <div className="d-flex justify-content-center gap-2">
            <button
              type="button"
              className="btn btn-light btn-sm px-3"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm px-3"
              onClick={handleExecuteDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default MiscManagement;
