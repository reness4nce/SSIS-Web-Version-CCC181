import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange, totalItems = 0, itemsPerPage = 10 }) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipsis logic
  const getPageNumbers = () => {
    const pages = [];
    const delta = 2; // Number of pages to show on each side of current page

    // Always show first page
    if (totalPages > 1) pages.push(1);

    // Calculate range around current page
    const rangeStart = Math.max(2, currentPage - delta);
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

    // Add ellipsis after first page if needed
    if (rangeStart > 2) pages.push('...');

    // Add pages in range
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i);
    }

    // Add ellipsis before last page if needed
    if (rangeEnd < totalPages - 1) pages.push('...');

    // Always show last page
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="pagination-container">
      {/* Pagination Info */}
      <div className="pagination-info">
        <span>Showing </span>
        <span className="current-page">{startItem}-{endItem}</span>
        <span> of </span>
        <span>{totalItems}</span>
        <span> entries</span>
      </div>

      {/* Pagination Controls */}
      <nav aria-label="Page navigation">
        <ul className="pagination">
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <button
              className="page-link"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              ‹ Prev
            </button>
          </li>

          {pageNumbers.map((number, index) => (
            <li key={index} className={`page-item ${currentPage === number ? 'active' : ''} ${number === '...' ? 'disabled' : ''}`}>
              {number === '...' ? (
                <span className="page-link" style={{ cursor: 'default' }}>...</span>
              ) : (
                <button
                  onClick={() => onPageChange(number)}
                  className="page-link"
                  aria-label={`Page ${number}`}
                  aria-current={currentPage === number ? 'page' : undefined}
                >
                  {number}
                </button>
              )}
            </li>
          ))}

          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <button
              className="page-link"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              Next ›
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Pagination;
