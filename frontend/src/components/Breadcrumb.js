import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiChevronRight } from 'react-icons/fi';
import './Breadcrumb.css';

const Breadcrumb = () => {
  const location = useLocation();

  // Define breadcrumb mappings
  const breadcrumbMap = {
    '/': [{ label: 'Dashboard', path: '/', icon: FiHome }],
    '/students': [
      { label: 'Dashboard', path: '/', icon: FiHome },
      { label: 'Students', path: '/students' }
    ],
    '/programs': [
      { label: 'Dashboard', path: '/', icon: FiHome },
      { label: 'Programs', path: '/programs' }
    ],
    '/colleges': [
      { label: 'Dashboard', path: '/', icon: FiHome },
      { label: 'Colleges', path: '/colleges' }
    ]
  };

  const breadcrumbs = breadcrumbMap[location.pathname] || [{ label: 'Dashboard', path: '/', icon: FiHome }];

  return (
    <nav aria-label="Breadcrumb navigation" className="breadcrumb">
      <ol className="breadcrumb-list">
        {breadcrumbs.map((crumb, index) => {
          const Icon = crumb.icon;
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={crumb.path} className="breadcrumb-item">
              {isLast ? (
                <span className="breadcrumb-current" aria-current="page">
                  {Icon && <Icon className="breadcrumb-icon" aria-hidden="true" />}
                  <span className="breadcrumb-text">{crumb.label}</span>
                </span>
              ) : (
                <>
                  <Link to={crumb.path} className="breadcrumb-link">
                    {Icon && <Icon className="breadcrumb-icon" aria-hidden="true" />}
                    <span className="breadcrumb-text">{crumb.label}</span>
                  </Link>
                  <FiChevronRight className="breadcrumb-separator" aria-hidden="true" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
