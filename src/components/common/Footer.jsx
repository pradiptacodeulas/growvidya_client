import React, { useState, useEffect } from 'react';
import { fetchFooterSettingApi } from '../../api/schoolConfig.api';

const Footer = () => {
  const [footerText, setFooterText] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadFooterSetting = async () => {
      try {
        const res = await fetchFooterSettingApi();
        const data = res?.data || res;
        if (isMounted) {
          setFooterText(data?.footer_text ? String(data.footer_text).trim() : '');
        }
      } catch (err) {
        console.error('Failed to load platform footer setting:', err);
      }
    };

    loadFooterSetting();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLinkClick = (e) => {
    e.preventDefault();
  };

  return (
    <footer className="footer bg-transparent border-0 py-3 px-4 mt-auto rounded-1 shadow-none" style={{ backgroundColor: 'transparent', borderTop: 'none' }}>
      <div className="container-fluid p-0">
        <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-2 text-center text-md-start">
          {/* Global SaaS Platform Footer Text */}
          <div className="text-muted fs-13">
            <span>{footerText}</span>
          </div>

          {/* Interactive Navigation Links (Clickable without redirect) */}
          <div className="d-flex align-items-center flex-wrap justify-content-center gap-3">
            <a
              href="#"
              onClick={handleLinkClick}
              className="text-muted fs-13 text-decoration-none hover-primary transition-all fw-medium"
              title="License"
            >
              License
            </a>
            <a
              href="#"
              onClick={handleLinkClick}
              className="text-muted fs-13 text-decoration-none hover-primary transition-all fw-medium"
              title="More Themes"
            >
              More Themes
            </a>
            <a
              href="#"
              onClick={handleLinkClick}
              className="text-muted fs-13 text-decoration-none hover-primary transition-all fw-medium"
              title="Documentation"
            >
              Documentation
            </a>
            <a
              href="#"
              onClick={handleLinkClick}
              className="text-muted fs-13 text-decoration-none hover-primary transition-all fw-medium"
              title="Support"
            >
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
