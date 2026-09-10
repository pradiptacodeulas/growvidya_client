import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logoDark from '../assets/logo_dark.png';
import '../styles/portalSelection.css';

const PortalSelection = () => {
  const [activeCard, setActiveCard] = useState('admin');

  const cards = [
    {
      id: 'admin',
      title: 'Admin',
      icon: 'ti ti-user-shield',
      description: 'Smart administrative portal & management tracking.',
      link: '/account/login/adminlogin',
    },
    {
      id: 'teacher',
      title: 'Teacher',
      icon: 'ti ti-user-star',
      description: 'Reliable academic & class management for dedicated educators.',
      link: '/teacheraccount/teacherlogin',
    },
    {
      id: 'parent',
      title: 'Parent',
      icon: 'ti ti-users',
      description: 'Streamlined portal for parents and guardians.',
      link: '/parentaccount/parentlogin',
    },
    {
      id: 'student',
      title: 'Student',
      icon: 'ti ti-school',
      description: 'Easy access for student assignments, results, and portal.',
      link: '/studentaccount/studentlogin',
    },
  ];

  const getCardClasses = (cardId) => {
    if (activeCard === cardId) {
      return 'attendance-card is-active';
    }

    const activeIndex = cards.findIndex((c) => c.id === activeCard);
    const currentIndex = cards.findIndex((c) => c.id === cardId);

    if (currentIndex < activeIndex && currentIndex === 0) {
      return 'attendance-card open-right';
    } else if (currentIndex > activeIndex && currentIndex === activeIndex + 1) {
      return 'attendance-card open-right';
    } else {
      return 'attendance-card open-left';
    }
  };

  return (
    <div className="main-wrapper bg-light min-vh-100 d-flex flex-column justify-content-start align-items-center pt-3 pt-md-4 pb-4">
      <div className="container">
        <div className="row justify-content-center align-items-center">
          {/* Header Section */}
          <div className="col-12 col-md-8 col-lg-6 mx-auto text-center mb-3">
            <div className="mb-2 mt-3 mt-md-4 pt-2">
              <img
                src={logoDark}
                className="img-fluid"
                alt="Growvidya Logo"
                style={{
                  maxHeight: '145px',
                  maxWidth: '100%',
                  height: 'auto',
                  objectFit: 'contain',
                }}
              />
            </div>
            <div className="text-center">
              <h2 className="mb-1 fw-bold" style={{ color: '#0a2d52', fontSize: '28px' }}>
                Access Here
              </h2>
            </div>
          </div>

          {/* Cards Section */}
          <div className="col-12 mx-auto">
            <div className="attendance-wrap">
              <div className="row g-3 justify-content-center align-items-stretch">
                {cards.map((card) => (
                  <div key={card.id} className="col-12 col-sm-6 col-md-6 col-lg-3 d-flex">
                    <Link className="attendance-link w-100" to={card.link}>
                      <div
                        className={getCardClasses(card.id)}
                        onMouseEnter={() => setActiveCard(card.id)}
                      >
                        <div className="ico">
                          <i className={card.icon}></i>
                        </div>
                        <h5>{card.title}</h5>
                        <p>{card.description}</p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* New School Registration Banner */}
          <div className="col-12 col-md-10 col-lg-8 mx-auto text-center mt-4">
            <div className="bg-white p-3 p-md-4 rounded-3 shadow-sm border d-flex flex-column flex-md-row align-items-center justify-content-between gap-3">
              <div className="text-md-start">
                <div className="d-flex align-items-center gap-2 mb-1 justify-content-center justify-content-md-start">
                  <span className="badge bg-primary-subtle text-primary fw-semibold px-2 py-1 fs-11">
                    NEW INSTITUTION
                  </span>
                  <h5 className="fw-bold mb-0 text-dark">Register Your School</h5>
                </div>
                <p className="text-muted fs-13 mb-0">
                  Ready to digitize your campus? Choose a subscription plan and setup your school portal in minutes.
                </p>
              </div>
              <Link
                to="/register"
                className="btn btn-primary px-4 py-2 fw-semibold d-flex align-items-center text-nowrap"
              >
                <i className="ti ti-school me-2 fs-16"></i> Register School
              </Link>
            </div>
          </div>

          {/* Footer Section */}
          <div className="col-12 text-center mt-3">
            <p className="mb-0 text-muted" style={{ fontSize: '13px' }}>
              Copyright &copy; 2026 - Growvidya
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalSelection;
