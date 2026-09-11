import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchStudentsApi } from '../../../api/adminStudent.api';
import { fetchTeacherClassesApi, fetchTeacherSectionsApi } from '../../../api/teacherAcademic.api';
import Avatar from '../../../components/common/Avatar';
import NoData from '../../../components/common/NoData';
import { encodeParam } from '../../../utils/idHelper';

const PAGE_SIZE = 12;

const TeacherStudentList = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);

  // Filter States (Active by default)
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [status, setStatus] = useState('1'); // 1 = Active
  const [admissionDate, setAdmissionDate] = useState('');

  // Ref for Infinite Scroll Sentinel & search debouncing
  const observerTargetRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Load Classes on mount
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await fetchTeacherClassesApi();
        const data = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.classes)
          ? res.data.classes
          : Array.isArray(res)
          ? res
          : [];
        setClasses(data);
      } catch (err) {
        console.error('Failed to load classes:', err);
      }
    };
    loadClasses();
  }, []);

  // Load Sections when selectedClass changes
  useEffect(() => {
    if (!selectedClass) {
      setSections([]);
      setSelectedSection('');
      return;
    }
    const loadSections = async () => {
      try {
        const res = await fetchTeacherSectionsApi(selectedClass);
        const data = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.sections)
          ? res.data.sections
          : Array.isArray(res)
          ? res
          : [];
        setSections(data);
      } catch (err) {
        console.error('Failed to load sections:', err);
        setSections([]);
      }
    };
    loadSections();
  }, [selectedClass]);

  // Server-level Fetch Function
  const fetchStudentBatch = async (pageToFetch, isAppend = false, customFilters = null) => {
    try {
      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const activeName = customFilters?.name !== undefined ? customFilters.name : name;
      const activeClass = customFilters?.classId !== undefined ? customFilters.classId : selectedClass;
      const activeSection = customFilters?.sectionId !== undefined ? customFilters.sectionId : selectedSection;
      const activeStatus = customFilters?.status !== undefined ? customFilters.status : status;
      const activeDate = customFilters?.admissionDate !== undefined ? customFilters.admissionDate : admissionDate;

      const params = {
        page: pageToFetch,
        limit: PAGE_SIZE,
        search: (activeName || '').trim(),
        classId: activeClass || '',
        sectionId: activeSection || '',
        status: activeStatus !== undefined ? activeStatus : '1',
        admissionDate: activeDate || '',
      };

      const res = await fetchStudentsApi(params);
      const studentList = Array.isArray(res?.data?.students)
        ? res.data.students
        : Array.isArray(res?.students)
        ? res.students
        : Array.isArray(res?.data)
        ? res.data
        : [];

      const total = res?.data?.pagination?.total !== undefined
        ? Number(res.data.pagination.total)
        : studentList.length;

      setTotalStudents(total);

      if (isAppend) {
        setStudents((prev) => {
          const combined = [...prev, ...studentList];
          setHasMore(combined.length < total);
          return combined;
        });
      } else {
        setStudents(studentList);
        setHasMore(studentList.length < total);
      }
      setPage(pageToFetch);
    } catch (err) {
      console.error('Failed to load student batch:', err);
      if (!isAppend) {
        setStudents([]);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchStudentBatch(1, false);
  }, []);

  const handleSearchSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    fetchStudentBatch(1, false);
  };

  // Handler for class change (also updates section state & triggers batch refresh)
  const handleClassChange = (e) => {
    const newClass = e.target.value;
    setSelectedClass(newClass);
    setSelectedSection('');
    fetchStudentBatch(1, false, { classId: newClass, sectionId: '' });
  };

  // Handler for section change
  const handleSectionChange = (e) => {
    const newSection = e.target.value;
    setSelectedSection(newSection);
    fetchStudentBatch(1, false, { sectionId: newSection });
  };

  // Handler for status change
  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    fetchStudentBatch(1, false, { status: newStatus });
  };

  // Handler for admission date change
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setAdmissionDate(newDate);
    fetchStudentBatch(1, false, { admissionDate: newDate });
  };

  // Handler for Name typing with debounce search
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setName(newName);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchStudentBatch(1, false, { name: newName });
    }, 400);
  };

  // Server-Level Infinite Scroll Intersection Observer
  useEffect(() => {
    const target = observerTargetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchStudentBatch(page + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: '150px' }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [hasMore, loading, loadingMore, page, name, selectedClass, selectedSection, status, admissionDate]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="content content-two">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">Students</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/teacher/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item">Ward</li>
              <li className="breadcrumb-item active" aria-current="page">
                Students Grid
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      {/* Filter */}
      <div className="bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-4 pb-0">
        <form onSubmit={handleSearchSubmit} className="row w-100">
          {/* Name / ID / Roll Search */}
          <div className="col-md-2">
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={handleNameChange}
                className="form-control"
                placeholder="Student Name"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Class Dropdown */}
          <div className="col-md-2">
            <div className="mb-3">
              <label className="form-label">Class</label>
              <select
                className="form-select"
                name="class"
                id="class"
                value={selectedClass}
                onChange={handleClassChange}
              >
                <option value="">Select</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name || cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section Dropdown */}
          <div className="col-md-2">
            <div className="mb-3">
              <label className="form-label">Section</label>
              <select
                className="form-select"
                name="section"
                id="section"
                value={selectedSection}
                onChange={handleSectionChange}
                disabled={!selectedClass}
              >
                <option value="">Select</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.section_name || sec.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="col-md-2">
            <div className="mb-3">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                name="status"
                value={status}
                onChange={handleStatusChange}
              >
                <option value="1">Active</option>
                <option value="2">Inactive</option>
                <option value="">All</option>
              </select>
            </div>
          </div>

          {/* Admission Date Picker */}
          <div className="col-md-2">
            <div className="mb-3">
              <label className="form-label">Admission Date</label>
              <input
                type="date"
                name="date"
                id="date"
                value={admissionDate}
                onChange={handleDateChange}
                className="form-control"
              />
            </div>
          </div>

          {/* Search Button */}
          <div className="col-md-2 d-flex align-items-center">
            <button type="submit" className="btn btn-outline-primary w-100">
              Search
            </button>
          </div>
        </form>
      </div>
      {/* /Filter */}

      {/* Student Card Grid */}
      <div className="row" id="studentCardDiv">
        {loading ? (
          <div className="col-12 text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted fs-13">Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="col-12">
            <NoData
              title="No Students Found"
              message="No student records matched the search criteria."
              imageHeight={120}
              py={4}
            />
          </div>
        ) : (
          students.map((student, idx) => {
            const isActive = Number(student.status) === 1;
            const studentName =
              student.full_name ||
              `${student.first_name || ''} ${student.last_name || ''}`.trim() ||
              'Student';
            const admissionNo = student.admission_number || `STU-${student.id}`;
            const className = student.class_name || student.class || '';
            const sectionName = student.section_name || student.section || '';
            const classSectionLabel = className
              ? `${className}${sectionName ? `, ${sectionName}` : ''}`
              : 'General';
            const rollNo = student.roll_number || student.roll_no || '1';
            const genderLabel =
              student.gender_name ||
              (String(student.gender) === '1'
                ? 'Male'
                : String(student.gender) === '2'
                ? 'Female'
                : student.gender || 'Male');
            const joinedOn = formatDate(student.admission_date || student.created_at);

            return (
              <div
                key={`${student.id}-${idx}`}
                className="col-xxl-3 col-xl-4 col-md-6 d-flex"
              >
                <input
                  type="hidden"
                  name="student"
                  className="studentId"
                  value={student.id}
                />
                <div className="card flex-fill">
                  <div className="card-header d-flex align-items-center justify-content-between">
                    <Link
                      to={`/teacher/students/details/${encodeParam(student.id)}`}
                      className="link-primary"
                    >
                      {admissionNo}
                    </Link>
                    <div className="d-flex align-items-center">
                      <span
                        className={`badge ${
                          isActive ? 'badge-soft-success' : 'badge-soft-danger'
                        } d-inline-flex align-items-center me-1`}
                      >
                        <i className="ti ti-circle-filled fs-5 me-1"></i>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="bg-light-300 rounded-2 p-3 mb-3">
                      <div className="d-flex align-items-center">
                        <Link
                          to={`/teacher/students/details/${encodeParam(student.id)}`}
                          className="avatar avatar-lg flex-shrink-0"
                        >
                          <Avatar
                            src={student.picture}
                            name={studentName}
                            className="img-fluid rounded-circle"
                          />
                        </Link>
                        <div className="ms-2 overflow-hidden">
                          <h5 className="mb-0 text-truncate">
                            <Link
                              to={`/teacher/students/details/${encodeParam(student.id)}`}
                              className="text-dark fw-bold text-decoration-none"
                            >
                              {studentName}
                            </Link>
                          </h5>
                          <p className="text-muted fs-12 mb-0">
                            {classSectionLabel}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center justify-content-between gx-2">
                      <div>
                        <p className="mb-0">Roll No</p>
                        <p className="text-dark">{rollNo}</p>
                      </div>
                      <div>
                        <p className="mb-0">Gender</p>
                        <p className="text-dark">{genderLabel}</p>
                      </div>
                      <div>
                        <p className="mb-0">Joined On</p>
                        <p className="text-dark">{joinedOn}</p>
                      </div>
                    </div>
                  </div>
                  <div className="card-footer d-flex align-items-center justify-content-end">
                    <Link
                      to={`/teacher/students/details/${encodeParam(student.id)}`}
                      className="btn btn-outline-success btn-sm fw-semibold"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Infinite Scroll Bottom Sentinel & Loader */}
        <div
          ref={observerTargetRef}
          id="loadingDiv"
          className={`col-12 text-center ${loadingMore ? '' : hasMore ? 'py-2' : 'd-none'}`}
          style={{ margin: '20px auto', width: '100%' }}
        >
          {loadingMore && (
            <div className="d-flex flex-column align-items-center">
              <div className="spinner-border text-primary spinner-border-sm mb-1" role="status">
                <span className="visually-hidden">Loading more...</span>
              </div>
              <span className="text-muted fs-12">Loading more students...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherStudentList;
