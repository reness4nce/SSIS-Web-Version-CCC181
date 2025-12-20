import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';
import { FiArrowUp, FiArrowDown, FiSearch, FiChevronDown, FiEdit, FiTrash2 } from 'react-icons/fi';
import { showConfirmDialog, showSuccessToast, showErrorToast } from '../utils/alert';
import Modal from '../components/Modal';
import ProgramForm from './ProgramForm';
import { useDebounce } from 'use-debounce';

const ProgramList = () => {
  const [programs, setPrograms] = useState([]);
  const [searchParams, setSearchParams] = useState({ search: '', filter: 'all' });
  const [sortParams, setSortParams] = useState({ sort: 'code', order: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [originalEditingCode, setOriginalEditingCode] = useState(null); // For tracking code changes in edit
  const [hasSearched, setHasSearched] = useState(false);

  const [debouncedSearch] = useDebounce(searchParams.search, 300);
  const [debouncedFilter] = useDebounce(searchParams.filter, 300);

  const fetchPrograms = useCallback(async () => {
    try {
      const response = await api.getPrograms({
        page: currentPage,
        per_page: 10,
        search: debouncedSearch,  // Use debounced values for better performance
        filter: debouncedFilter,
        sort: sortParams.sort,
        order: sortParams.order,
      });
      setPrograms(response.data.items);
      setTotalPages(response.data.pages);
      setTotalItems(response.data.total);
    } catch (error) {
      showErrorToast('Error fetching programs.');
      console.error("Error fetching programs:", error);
    }
  }, [currentPage, debouncedSearch, debouncedFilter, sortParams.sort, sortParams.order]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

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
    const result = await showConfirmDialog({
      title: 'Delete Program?',
      text: 'This program will be permanently deleted. Students enrolled in this program will show "N/A" for their course. Are you sure?',
      confirmButtonText: 'Delete Program'
    });

    if (result.isConfirmed) {
      try {
        await api.deleteProgram(code);
        showSuccessToast('Program deleted successfully!');
        fetchPrograms();
      } catch (error) {
        showErrorToast(error.response?.data?.error || 'Error deleting program.');
      }
    }
  };

  const handleFormSuccess = (programData, operation) => {
    if (operation === 'update' && programData && originalEditingCode) {
      // For updates, replace the program in the current list
      // This preserves pagination, search, and filter state
      setPrograms(prev =>
        prev.map(program =>
          program.code === originalEditingCode ? programData : program
        )
      );
    } else if (operation === 'create' && programData) {
      // For new programs, refresh to show the new record
      // (it might be on a different page or filtered out)
      fetchPrograms();
    } else {
      // Fallback: refresh data
      fetchPrograms();
    }

    // Reset the original code tracker
    setOriginalEditingCode(null);

    // Close modal after a brief delay to allow state to update
    setTimeout(() => {
      closeModal();
    }, 100);
  };

  const openAddModal = () => { setEditingProgram(null); setIsModalOpen(true); };
  const openEditModal = async (program) => {
    // Save the original code for handling any code changes
    setOriginalEditingCode(program.code);

    // Always fetch fresh data when opening edit modal to ensure we have latest changes
    try {
      const response = await api.getProgram(program.code);
      const freshProgram = response.data;
      setEditingProgram(freshProgram);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching fresh program data:", error);
      // Fallback to using the provided program data if fresh fetch fails
      setEditingProgram(program);
      setIsModalOpen(true);
    }
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProgram(null);
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
        <h1 className="header-title">Programs</h1>
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
                  <option value="code">Search by Program Code</option>
                  <option value="name">Search by Program Name</option>
                  <option value="college">Search by College</option>
                </select>
                <FiChevronDown className="dropdown-icon" aria-hidden="true" />
              </div>

              {/* Enhanced Search Input */}
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  className="form-control search-input"
                  name="search"
                  placeholder="Search programs..."
                  value={searchParams.search}
                  onChange={handleSearchChange}
                  onFocus={(e) => {
                    // Clear any browser-persisted text on focus
                    if (e.target.value && !searchParams.search) {
                      e.target.value = '';
                    }
                  }}
                  aria-label={`Search programs by ${searchParams.filter}`}
                  autoComplete="off"
                  data-testid="search-input"
                  style={{ paddingRight: '3rem' }}
                />
                <FiSearch className="search-icon" aria-hidden="true" />
              </div>
            </div>
          </div>

          <button className="btn add-btn" onClick={openAddModal}>
            <span className="add-icon" aria-hidden="true">＋</span> Add Program
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
              <th className="col-program-name" onClick={() => handleSort('name')} style={getSortButtonStyle('name')}>
                Name {renderSortArrow('name')}
                {sortParams.sort === 'name' && (
                  <span style={{ marginLeft: '8px', fontSize: '0.8em', opacity: 0.8 }}>
                    ({sortParams.order === 'asc' ? '↑' : '↓'})
                  </span>
                )}
              </th>
              <th className="college-name" onClick={() => handleSort('college')} style={getSortButtonStyle('college')}>
                College {renderSortArrow('college')}
                {sortParams.sort === 'college' && (
                  <span style={{ marginLeft: '8px', fontSize: '0.8em', opacity: 0.8 }}>
                    ({sortParams.order === 'asc' ? '↑' : '↓'})
                  </span>
                )}
              </th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {programs && programs.length > 0 ? (
              programs.map((program) => (
                <tr key={program.code}>
                  <td>{program.code || 'N/A'}</td>
                  <td>
                    <div className="program-name" title={program.name}>
                      {program.name || 'N/A'}
                    </div>
                  </td>
                  <td>
                    <div className="college-name text-truncate" title={program.college || program.college_name}>
                      {program.college || program.college_name || 'N/A'}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => openEditModal(program)}
                        aria-label={`Edit program ${program.name}`}
                        title="Edit program"
                      >
                        <FiEdit size={14} aria-hidden="true" />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(program.code)}
                        aria-label={`Delete program ${program.name}`}
                        title="Delete program"
                      >
                        <FiTrash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="empty-state">
                  <div className="empty-state-icon">
                    {hasSearched && (searchParams.search || searchParams.filter !== 'all') ? '🔍' : '📚'}
                  </div>
                  <div className="empty-state-text">
                    {hasSearched && (searchParams.search || searchParams.filter !== 'all')
                      ? `No programs found matching "${searchParams.search}" in ${searchParams.filter === 'all' ? 'all fields' : searchParams.filter}.`
                      : 'No programs found.'}
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
        entityType="programs"
      />
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingProgram ? 'Edit Program' : 'Add Program'}>
        <ProgramForm
          onSuccess={handleFormSuccess}
          program={editingProgram}
          originalCode={originalEditingCode}
          onClose={closeModal}
        />
      </Modal>
    </div>
  );
};

export default ProgramList;
