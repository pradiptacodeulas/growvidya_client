import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { fetchTeacherClassesApi } from '../../../api/teacherAcademic.api';
import { fetchShiftsApi } from '../../../api/adminAcademic.api';
import { encodeParam } from '../../../utils/idHelper';
import NoData from '../../../components/common/NoData';

const TeacherAssignments = () => {
  const { teacher } = useSelector((state) => state.teacherAuth);
  const teacherId = teacher?.id || teacher?.teacherId;

  const [shifts, setShifts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShiftsAndClasses();
  }, [teacherId]);

  const fetchShiftsAndClasses = async () => {
    try {
      setLoading(true);
      const [shiftsRes, classesRes] = await Promise.all([
        fetchShiftsApi().catch(() => ({ data: [] })),
        fetchTeacherClassesApi().catch(() => ({ data: [] })),
      ]);

      const shiftList = Array.isArray(shiftsRes?.data)
        ? shiftsRes.data
        : Array.isArray(shiftsRes)
        ? shiftsRes
        : [];
      const classList = Array.isArray(classesRes?.data)
        ? classesRes.data
        : Array.isArray(classesRes)
        ? classesRes
        : [];

      setShifts(shiftList.filter((s) => Number(s.status) === 1));
      setClasses(classList.filter((c) => Number(c.status) === 1));
    } catch (err) {
      console.error('Failed to load class assignment shifts:', err);
      toast.error('Failed to load class assignments.');
    } finally {
      setLoading(false);
    }
  };

  // Group classes by shift (only including shifts that have teacher-assigned classes)
  const groupedShifts = shifts
    .map((shift) => {
      const shiftClasses = classes.filter(
        (c) =>
          Number(c.shift_id) === Number(shift.id) ||
          (c.shift_name &&
            c.shift_name.trim().toLowerCase() === shift.shift_name.trim().toLowerCase())
      );
      return {
        ...shift,
        classes: shiftClasses,
      };
    })
    .filter((shift) => shift.classes.length > 0);

  // Handle any classes without an assigned shift
  const unassignedClasses = classes.filter(
    (c) =>
      !shifts.some(
        (s) =>
          Number(s.id) === Number(c.shift_id) ||
          (c.shift_name &&
            c.shift_name.trim().toLowerCase() === s.shift_name.trim().toLowerCase())
      )
  );

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div className="my-auto mb-2">
          <h3 className="page-title mb-1">My Class Assignments</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/teacher/dashboard">Dashboard</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Class Assignment
              </li>
            </ol>
          </nav>
        </div>
      </div>
      {/* /Page Header */}

      {/* Shifts & Classes List */}
      <div className="row">
        {loading ? (
          <div className="col-12 text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted fs-13">Loading class assignments...</p>
          </div>
        ) : groupedShifts.length === 0 && unassignedClasses.length === 0 ? (
          <div className="col-12">
            <NoData
              title="No Assigned Classes Found"
              message="You do not have any classes or shifts assigned yet."
              imageHeight={120}
              py={4}
            />
          </div>
        ) : (
          <>
            {groupedShifts.map((shift) => {
              const shiftTitle = shift.shift_name
                ? shift.shift_name.trim().includes('Shift')
                  ? shift.shift_name.trim()
                  : `${shift.shift_name.trim()} Shift`
                : `Shift ${shift.id}`;

              return (
                <div key={shift.id} className="col-md-12 mb-4">
                  <div className="card shadow-sm border">
                    <div className="card-header bg-light d-flex align-items-center justify-content-between py-3 px-4 border-bottom">
                      <h5 className="mb-0 text-dark fw-bold">
                        <i className="fa-solid fa-clock me-2 text-primary"></i> {shiftTitle}
                      </h5>
                      <span className="badge bg-white text-primary border px-3 py-1.5 fs-12 fw-semibold">
                        {shift.classes.length} Class(es)
                      </span>
                    </div>
                    <div className="card-body p-4 bg-light">
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
                            return (
                              <div
                                key={cls.id}
                                className="col-md-6 col-lg-4 col-xl-3"
                              >
                                <div className="card h-100 border-0 shadow-sm rounded-3 overflow-hidden position-relative hover-top transition-all">
                                  <div className="card-body p-3 text-center bg-white">
                                    <div
                                      className="avatar avatar-md bg-primary-subtle text-primary rounded-circle mb-3 mx-auto d-flex align-items-center justify-content-center"
                                      style={{ width: '50px', height: '50px' }}
                                    >
                                      <i className="fa-solid fa-chalkboard-user fs-20"></i>
                                    </div>
                                    <h5 className="fw-bold text-dark mb-1">
                                      {cls.class_name || cls.name}
                                    </h5>
                                    <p className="text-muted small mb-3">
                                      Manage assignments for this class
                                    </p>
                                    <Link
                                      to={`/teacher/academics/assignments/section/${encodeParam(cls.id)}`}
                                      className="btn btn-outline-primary btn-sm w-100 rounded-pill fw-semibold"
                                    >
                                      Select Class{' '}
                                      <i className="fa-solid fa-arrow-right ms-1"></i>
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {unassignedClasses.length > 0 && (
              <div className="col-md-12 mb-4">
                <div className="card shadow-sm border">
                  <div className="card-header bg-light d-flex align-items-center justify-content-between py-3 px-4 border-bottom">
                    <h5 className="mb-0 text-dark fw-bold">
                      <i className="fa-solid fa-clock me-2 text-primary"></i> General Classes
                    </h5>
                    <span className="badge bg-white text-primary border px-3 py-1.5 fs-12 fw-semibold">
                      {unassignedClasses.length} Class(es)
                    </span>
                  </div>
                  <div className="card-body p-4 bg-light">
                    <div className="row g-3">
                      {unassignedClasses.map((cls) => {
                        return (
                          <div
                            key={cls.id}
                            className="col-md-6 col-lg-4 col-xl-3"
                          >
                            <div className="card h-100 border-0 shadow-sm rounded-3 overflow-hidden position-relative hover-top transition-all">
                              <div className="card-body p-3 text-center bg-white">
                                <div
                                  className="avatar avatar-md bg-primary-subtle text-primary rounded-circle mb-3 mx-auto d-flex align-items-center justify-content-center"
                                  style={{ width: '50px', height: '50px' }}
                                >
                                  <i className="fa-solid fa-chalkboard-user fs-20"></i>
                                </div>
                                <h5 className="fw-bold text-dark mb-1">
                                  {cls.class_name || cls.name}
                                </h5>
                                <p className="text-muted small mb-3">
                                  Manage assignments for this class
                                </p>
                                <Link
                                  to={`/teacher/academics/assignments/section/${encodeParam(cls.id)}`}
                                  className="btn btn-outline-primary btn-sm w-100 rounded-pill fw-semibold"
                                >
                                  Select Class{' '}
                                  <i className="fa-solid fa-arrow-right ms-1"></i>
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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

export default TeacherAssignments;
