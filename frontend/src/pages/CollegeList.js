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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [debouncedSearch] = useDebounce(searchParams.search, 300);
  const [debouncedFilter] = useDebounce(searchParams.filter, 300);

  const fetchColleges = useCallback(async () => {
    try {
      const response = await api.getColleges({
        page: currentPage,
        per_page: 10,
        search: debouncedSearch,
        filter: debouncedFilter,
        sort: sortParams.sort,
        order: sortParams.order,
      });
      setColleges(response.data.items);
      setTotalPages(response.data.pages);
    } catch (error) {
      showErrorToast('Error fetching colleges.');
      console.error("Error fetching colleges:", error);
    }
  }, [currentPage, debouncedSearch, debouncedFilter, sortParams]);

  useEffect(() => {
    fetchColleges();
  }, [fetchColleges]);

  const handleSearchChange = (e) => {
    setSearchParams({ ...searchParams, [e.target.name]: e.target.value });
    setCurrentPage(1);
    setHasSearched(true);
  };

  const handleSort = (field) => {
    const order = sortParams.sort === field && sortParams.order === 'asc' ? 'desc' : 'asc';
    setSortParams({ sort: field, order });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleDelete = async (code) => {
    const result = await showConfirmDialog({ title: 'Are you sure?', text: 'This college will be permanently deleted.' });
    if (result.isConfirmed) {
      try {
        await api.deleteCollege(code);
        showSuccessToast('College deleted successfully!');
        fetchColleges();
      } catch (error) {
        showErrorToast(error.response?.data?.error || 'Error deleting college.');
      }
    }
  };

  const handleFormSuccess = () => {
    // Reset to first page and refresh data
    setCurrentPage(1);
    setSearchParams({ search: '', filter: 'all' });
    fetchColleges();
    closeModal();
  };

  const openAddModal = () => { setEditingCollege(null); setIsModalOpen(true); };
  const openEditModal = (college) => { setEditingCollege(college); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditingCollege(null); };

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
          <div className="search-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 380 }}>
              
  {/* Filter Dropdown with Custom Icon */}
            <div style={{ position: 'relative', width: 130 }}>
              <select
                name="filter"
                value={searchParams.filter}
                onChange={handleSearchChange}
                className="form-control"
                style={{
                  width: '100%',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  paddingRight: '2em',
                  background: 'none'
                }}
              >
                <option value="all">All Fields</option>
                <option value="code">College Code</option>
                <option value="name">College Name</option>
              </select>
              <span style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: '#aaa',
                zIndex: 2,
              }}>
                <FiChevronDown size={19} />
              </span>
            </div>

            {/* Search Input with Icon */}
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-control search-input"
                name="search"
                placeholder={`Search by ${searchParams.filter === 'all' ? 'All Fields' : searchParams.filter.replace(/^\w/, (c) => c.toUpperCase())}`}
                value={searchParams.search}
                onChange={handleSearchChange}
                aria-label={`Search students by ${searchParams.filter}`}
                autoComplete="on"
                style={{ paddingRight: '2.5rem', width: '100%' }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#aaa',
                }}
              >
                <FiSearch size={18} />
              </span>
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
              <th onClick={() => handleSort('code')} style={getSortButtonStyle('code')}>
                Code {renderSortArrow('code')}
                {sortParams.sort === 'code' && (
                  <span style={{ marginLeft: '8px', fontSize: '0.8em', opacity: 0.8 }}>
                    ({sortParams.order === 'asc' ? '↑' : '↓'})
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('name')} style={getSortButtonStyle('name')}>
                Name {renderSortArrow('name')}
                {sortParams.sort === 'name' && (
                  <span style={{ marginLeft: '8px', fontSize: '0.8em', opacity: 0.8 }}>
                    ({sortParams.order === 'asc' ? '↑' : '↓'})
                  </span>
                )}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {colleges && colleges.length > 0 ? (
              colleges.map((college) => (
                <tr key={college.code}>
                  <td>{college.code || 'N/A'}</td>
                  <td>{college.name || 'N/A'}</td>
                  <td>
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => openEditModal(college)}
                      aria-label={`Edit college ${college.name}`}
                      title="Edit college"
                    >
                      <FiEdit size={14} style={{ marginRight: '4px' }} />
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm ml-2"
                      onClick={() => handleDelete(college.code)}
                      aria-label={`Delete college ${college.name}`}
                      title="Delete college"
                    >
                      <FiTrash2 size={14} style={{ marginRight: '4px' }} />
                      Delete
                    </button>
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
                      onClick={() => {
                        setSearchParams({ search: '', filter: 'all' });
                        setHasSearched(false);
                        setCurrentPage(1);
                      }}
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
        totalItems={totalPages * 10}
        itemsPerPage={10}
      />
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCollege ? 'Edit College' : 'Add College'}>
        <CollegeForm onSuccess={handleFormSuccess} college={editingCollege} />
      </Modal>
    </div>
  );
};

export default CollegeList;
