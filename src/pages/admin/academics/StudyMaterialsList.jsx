import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import adminAcademicApi from '../../../api/adminAcademic.api';

const StudyMaterialsList = () => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clsRes, subRes] = await Promise.all([
        adminAcademicApi.fetchClassesApi().catch(() => ({ data: [] })),
        adminAcademicApi.fetchSubjectsApi().catch(() => ({ data: [] })),
      ]);
      setClasses(Array.isArray(clsRes?.data) ? clsRes.data : []);
      setSubjects(Array.isArray(subRes?.data) ? subRes.data : []);
    } catch (err) {
      toast.error('Failed to load study material prerequisites.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between mb-3">
        <div>
          <h3 className="page-title mb-1"><i className="ti ti-folder me-2 text-primary"></i>Study Material &amp; E-Learning</h3>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item"><Link to="/admin/dashboard">Dashboard</Link></li>
              <li className="breadcrumb-item"><Link to="/admin/academics/study-material">Academic</Link></li>
              <li className="breadcrumb-item active">Study Material</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-primary" onClick={() => toast.info('File upload storage ready')}>
            <i className="ti ti-upload me-1"></i> Upload Study Material
          </button>
        </div>
      </div>

      {/* Card Table */}
      <div className="card border-0 shadow-sm p-4 text-center">
        <div className="avatar avatar-xl bg-primary-subtle text-primary rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px' }}>
          <i className="ti ti-folder fs-32"></i>
        </div>
        <h5 className="fw-bold text-dark mb-1">Study Material &amp; Digital Learning Resources</h5>
        <p className="text-muted mb-4" style={{ maxWidth: '500px', margin: '0 auto' }}>
          Upload PDF lecture notes, sample question banks, reference links, and multimedia study resources for classes and subjects.
        </p>
        <div className="d-flex justify-content-center gap-2">
          <button className="btn btn-primary" onClick={() => toast.info('Upload modal triggered')}>
            <i className="ti ti-plus me-1"></i> Add Material
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyMaterialsList;
