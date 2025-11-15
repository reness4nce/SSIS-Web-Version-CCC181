import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';
import { FiArrowUp, FiArrowDown, FiSearch, FiChevronDown, FiEdit, FiTrash2 } from 'react-icons/fi';
import { showConfirmDialog, showSuccessToast, showErrorToast } from '../utils/alert';
import Modal from '../components/Modal';
import CollegeForm from './CollegeForm';
import { useDebounce } from 'use-debounce';

const CollegeList = () => {
  const [colleges, setColleges] = useState([]);
  const [searchParams, setSearchParams] = useState({ search: '', filter: 'all' });
  const [sortParams, setSortParams] = useState({ sort: 'code', order: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState(null);
  const [originalEditingCode, setOriginalEditingCode] = useState(null); // For tracking code changes in edit
  const [hasSearched, setHasSearched] = useState(false);

  const [debouncedSearch] = useDebounce(searchParams.search, 300);
  const [debouncedFilter] = useDebounce(searchParams.filter, 300);

  const fetchColleges = useCallback(async () => {
    try {
      const response = await api.getColleges({
        page: currentPage,
        per_page: 10,
        search: debouncedSearch,  // Use debounced values for better performance
        filter: debouncedFilter,
        sort: sortParams.sort,
        order: sortParams.order,
      });
      setColleges(response.data.items);
      setTotalPages(response.data.pages);
      setTotalItems(response.data.total);
    } catch (error) {
      showErrorToast('Error fetching colleges.');
      console.error("Error fetching colleges:", error);
    }
  }, [currentPage, debouncedSearch, debouncedFilter, sortParams.sort, sortParams.order]);

  useEffect(() => {
    fetchColleges();
  }, [fetchColleges]);

  const handleSearchChange = (e) => {
    setSearchParams({ ...searchParams, [e.target.name]: e.target.value });
    setCurrentPage(1);
    setHasSearched(true);
  };

  const handleClearSearch = () => {
    setSearchParams({ search: '', filter: 'all' });
    setHasSearched(false);
    setCurrentPage(1);
    // Force input to clear by resetting the element directly
    const searchInput = document.querySelector('input[name="search"]');
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
  };

  const handleSort = (field) => {
    const order = sortParams.sort === field && sortParams.order === 'asc' ? 'desc' : 'asc';
    setSortParams({ sort: field, order });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleDelete = async (code) => {
    try {
      // First, get the college details to check for dependencies
      const collegeResponse = await api.getCollege(code);
      const college = collegeResponse.data;

      // Check if college has programs
      if (college.programs && college.programs.length > 0) {
        const programCount = college.programs.length;
        const enrolledStudents = college.total_students || 0;

        const warningMessage = `This college has ${programCount} program${programCount > 1 ? 's' : ''} with ${enrolledStudents} enrolled student${enrolledStudents !== 1 ? 's' : ''}. Deleting this college will affect all associated programs and students. Are you sure you want to proceed?`;

        const result = await showConfirmDialog({
          title: 'Delete College?',
          text: warningMessage,
          confirmButtonText: 'I Understand, Delete Anyway',
          confirmButtonColor: '#d33',
          showCancelButton: true
        });

        if (!result.isConfirmed) {
          return;
        }
      } else {
        // No programs, show standard confirmation
        const result = await showConfirmDialog({
          title: 'Delete College?',
          text: 'This college will be permanently deleted. Are you sure?',
          confirmButtonText: 'Delete College'
        });

        if (!result.isConfirmed) {
          return;
        }
      }

      // Attempt deletion
      await api.deleteCollege(code);
      showSuccessToast('College deleted successfully!');
      fetchColleges();
    } catch (error) {
      if (error.response?.status === 400) {
        // Backend validation error - show the specific error message
        showErrorToast(error.response.data.error || 'Cannot delete college due to existing dependencies.');
      } else {
        showErrorToast('Error deleting college. Please try again.');
      }
      console.error('Error deleting college:', error);
    }
  };

  const handleFormSuccess = (collegeData, operation) => {
    if (operation === 'update' && collegeData && originalEditingCode) {
      // For updates, replace the college in the current list
      // This preserves pagination, search, and filter state
      setColleges(prev =>
        prev.map(college =>
          college.code === originalEditingCode ? collegeData : college
        )
      );
    } else if (operation === 'create' && collegeData) {
      // For new colleges, refresh to show the new record
      // (it might be on a different page or filtered out)
      fetchColleges();
    } else {
      // Fallback: refresh data
      fetchColleges();
    }

    // Close modal after a brief delay to allow state to update
    setTimeout(() => {
      closeModal();
    }, 100);
  };

  const openAddModal = () => { setEditingCollege(null); setIsModalOpen(true); };
  const openEditModal = async (college) => {
    // Save the original code for handling any code changes
    setOriginalEditingCode(college.code);

    // Always fetch fresh data when opening edit modal to ensure we have latest changes
    try {
      const response = await api.getCollege(college.code);
      const freshCollege = response.data;
      setEditingCollege(freshCollege);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching fresh college data:", error);
      // Fallback to using the provided college data if fresh fetch fails
      setEditingCollege(college);
      setIsModalOpen(true);
    }
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCollege(null);
    setOriginalEditingCode(null);
  };

  const renderSortArrow = (field) => {
    if (sortParams.sort === field) {
      return sortParams.order === 'asc' ? <FiArrowUp /> : <FiArrowDown />;
    }
    return null;
  };

  const getSortButtonStyle = (field) => {
    if (sortParams.sort === field) {
      return {
        cursor: 'pointer',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: '#fff',
        fontWeight: 'bold'
      };
    }
    return { cursor: 'pointer' };
  };

  return (
    <div>
      <div className="main-header">
        <h1 className="header-title">Colleges</h1>
        <div className="header-actions" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="search-container" style={{ width: 380 }}>
            <div className="search-input-container">
              {/* Filter Dropdown with enhanced accessibility */}
              <div className={`filter-dropdown ${searchParams.filter !== 'all' ? 'filter-active' : ''}`}>
                <select
                  name="filter"
                  value={searchParams.filter}
                  onChange={handleSearchChange}
                  className="form-control"
                  aria-label="Search field filter"
                >
                  <option value="all">Search all fields</option>
                  <option value="code">Search by College Code</option>
                  <option value="name">Search by College Name</option>
                </select>
                <FiChevronDown className="dropdown-icon" aria-hidden="true" />
              </div>

              {/* Enhanced Search Input */}
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  className="form-control search-input"
                  name="search"
                  placeholder="Search colleges..."
                  value={searchParams.search}
                  onChange={handleSearchChange}
                  onFocus={(e) => {
                    // Clear any browser-persisted text on focus
                    if (e.target.value && !searchParams.search) {
                      e.target.value = '';
                    }
                  }}
                  aria-label={`Search colleges by ${searchParams.filter}`}
                  autoComplete="off"
                  data-testid="search-input"
                  style={{ paddingRight: '3rem' }}
                />
                <FiSearch className="search-icon" aria-hidden="true" />
              </div>
            </div>
          </div>

          <button className="btn add-btn" onClick={openAddModal}>
            <span className="add-icon" aria-hidden="true">＋</span> Add College
          </button>
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="col-code" onClick={() => handleSort('code')} style={getSortButtonStyle('code')}>
                Code {renderSortArrow('code')}
                {sortParams.sort === 'code' && (
                  <span style={{ marginLeft: '8px', fontSize: '0.8em', opacity: 0.8 }}>
                    ({sortParams.order === 'asc' ? '↑' : '↓'})
                  </span>
                )}
              </th>
              <th className="col-name" onClick={() => handleSort('name')} style={getSortButtonStyle('name')}>
                Name {renderSortArrow('name')}
                {sortParams.sort === 'name' && (
                  <span style={{ marginLeft: '8px', fontSize: '0.8em', opacity: 0.8 }}>
                    ({sortParams.order === 'asc' ? '↑' : '↓'})
                  </span>
                )}
              </th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {colleges && colleges.length > 0 ? (
              colleges.map((college) => (
                <tr key={college.code}>
                  <td>{college.code || 'N/A'}</td>
                  <td>{college.name || 'N/A'}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => openEditModal(college)}
                        aria-label={`Edit college ${college.name}`}
                        title="Edit college"
                      >
                        <FiEdit size={14} aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(college.code)}
                        aria-label={`Delete college ${college.name}`}
                        title="Delete college"
                      >
                        <FiTrash2 size={14} aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="empty-state">
                  <div className="empty-state-icon">
                    {hasSearched && (searchParams.search || searchParams.filter !== 'all') ? '🔍' : '🏛️'}
                  </div>
                  <div className="empty-state-text">
                    {hasSearched && (searchParams.search || searchParams.filter !== 'all')
                      ? `No colleges found matching "${searchParams.search}" in ${searchParams.filter === 'all' ? 'all fields' : searchParams.filter}.`
                      : 'No colleges found.'}
                  </div>
                  {hasSearched && (searchParams.search || searchParams.filter !== 'all') && (
                    <button
                      className="btn btn-primary mt-3"
                      onClick={handleClearSearch}
                    >
                      Clear Search
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        totalItems={totalItems}
        itemsPerPage={10}
        entityType="colleges"
      />
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCollege ? 'Edit College' : 'Add College'}>
        <CollegeForm onSuccess={handleFormSuccess} college={editingCollege} onClose={closeModal} />
      </Modal>
    </div>
  );
};

export default CollegeList;
