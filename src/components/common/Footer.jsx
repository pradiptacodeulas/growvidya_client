import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { fetchSchoolConfigApi } from '../../api/schoolConfig.api';

const Footer = () => {
  const adminUser = useSelector((state) => state.auth?.user);
  const currentYear = new Date().getFullYear();

  const [footerText, setFooterText] = useState(
    () => adminUser?.schoolName
      ? `Copyright © ${currentYear} ${adminUser.schoolName}. All rights reserved.`
      : `Copyright © ${currentYear} Growvidya. All rights reserved.`
  );

  useEffect(() => {
    let isMounted = true;

    const loadSchoolFooter = async () => {
      try {
        const res = await fetchSchoolConfigApi();
        const data = res?.data || res;
        if (data && isMounted) {
          if (data.footer && data.footer.trim()) {
            setFooterText(data.footer.trim());
          } else if (data.school_title || data.school_name) {
            const title = data.school_title || data.school_name;
            setFooterText(`Copyright © ${currentYear} ${title}. All rights reserved.`);
          }
        }
      } catch (err) {
        console.error('Failed to load school footer configuration:', err);
      }
    };

    loadSchoolFooter();

    return () => {
      isMounted = false;
    };
  }, [currentYear]);

  const handleLinkClick = (e) => {
    e.preventDefault();
  };

  return (
    <footer className="footer bg-white border-top py-3 px-4 mt-auto rounded-1 shadow-none">
      <div className="container-fluid p-0">
        <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-2 text-center text-md-start">
          {/* Dynamic School Configuration Copyright Text */}
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
