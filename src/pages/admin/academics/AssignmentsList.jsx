import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fetchClassesApi, fetchShiftsApi } from '../../../api/adminAcademic.api';

const AssignmentsList = () => {
  const [shifts, setShifts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShiftsAndClasses();
  }, []);

  const fetchShiftsAndClasses = async () => {
    try {
      setLoading(true);
      const [shiftsRes, classesRes] = await Promise.all([
        fetchShiftsApi().catch(() => ({ data: [] })),
        fetchClassesApi().catch(() => ({ data: [] })),
      ]);

      const shiftList = Array.isArray(shiftsRes?.data) ? shiftsRes.data : Array.isArray(shiftsRes) ? shiftsRes : [];
      const classList = Array.isArray(classesRes?.data) ? classesRes.data : Array.isArray(classesRes) ? classesRes : [];

      setShifts(shiftList.filter((s) => s.status === 1));
      setClasses(classList.filter((c) => c.status === 1));
    } catch (err) {
      toast.error('Failed to load class assignment shifts.');
    } finally {
      setLoading(false);
    }
  };

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
      </div>
      {/* /Page Header */}

      {/* Shifts & Classes Grid */}
      <div className="p-0 py-3">
        {loading ? (
          <div className="card p-5 text-center shadow-sm border-0">
            <div className="spinner-border text-primary mx-auto mb-3" role="status"></div>
            <p className="text-muted mb-0">Loading class assignments structure...</p>
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
                    <p className="text-muted mb-0 fst-italic">No classes assigned to this shift.</p>
                  ) : (
                    <div className="row g-3">
                      {shift.classes.map((cls) => {
                        const encodedClassId = btoa(String(cls.id));
                        return (
                          <div key={cls.id} className="col-xl-3 col-lg-4 col-md-6">
                            <Link
                              to={`/admin/academics/assignments/section/${encodedClassId}`}
                              className="text-decoration-none"
                            >
                              <div className="class-card text-center p-4 border rounded shadow-sm bg-white hover-shadow transition-all">
                                <div
                                  className="class-icon mb-3 mx-auto bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center"
                                  style={{ width: '56px', height: '56px' }}
                                >
                                  <i className="ti ti-school fs-24"></i>
                                </div>
                                <h6 className="mb-0 text-dark fw-bold fs-16">{cls.class_name}</h6>
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
                      const encodedClassId = btoa(String(cls.id));
                      return (
                        <div key={cls.id} className="col-xl-3 col-lg-4 col-md-6">
                          <Link
                            to={`/admin/academics/assignments/section/${encodedClassId}`}
                            className="text-decoration-none"
                          >
                            <div className="class-card text-center p-4 border rounded shadow-sm bg-white hover-shadow transition-all">
                              <div
                                className="class-icon mb-3 mx-auto bg-secondary-subtle text-secondary rounded-circle d-flex align-items-center justify-content-center"
                                style={{ width: '56px', height: '56px' }}
                              >
                                <i className="ti ti-school fs-24"></i>
                              </div>
                              <h6 className="mb-0 text-dark fw-bold fs-16">{cls.class_name}</h6>
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
