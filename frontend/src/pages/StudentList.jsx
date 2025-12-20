import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiArrowUp, FiArrowDown, FiSearch, FiChevronDown, FiEdit, FiTrash2 } from 'react-icons/fi';
import { useDebounce } from 'use-debounce';

import api from '../services/api';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import StudentForm from './StudentForm';
import StudentAvatar from '../components/StudentAvatar';
import { showConfirmDialog, showSuccessToast, showErrorToast } from '../utils/alert';

// Constants
const ITEMS_PER_PAGE = 10;
const DEBOUNCE_DELAY = 300;

const FILTER_OPTIONS = [
  { value: 'all', label: 'Search all fields' },
  { value: 'id', label: 'Search by Student ID' },
  { value: 'firstname', label: 'Search by First Name' },
  { value: 'lastname', label: 'Search by Last Name' },
  { value: 'course', label: 'Search by Course' }
];

const SORTABLE_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'firstname', label: 'First Name' },
  { key: 'lastname', label: 'Last Name' },
  { key: 'course', label: 'Course' },
  { key: 'year', label: 'Year' },
  { key: 'gender', label: 'Gender' }
];

const StudentList = () => {
  // State management
  const [students, setStudents] = useState([]);
  const [searchParams, setSearchParams] = useState({ search: '', filter: 'all' });
  const [sortParams, setSortParams] = useState({ sort: 'id', order: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [originalEditingId, setOriginalEditingId] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [justUploadedPhoto, setJustUploadedPhoto] = useState(false);
  const [justRemovedPhoto, setJustRemovedPhoto] = useState(false);
  const [justSubmittedForm, setJustSubmittedForm] = useState(null); // { operation, hasPhoto }

  // Debounced search for performance
  const [debouncedSearch] = useDebounce(searchParams.search, DEBOUNCE_DELAY);
  const [debouncedFilter] = useDebounce(searchParams.filter, DEBOUNCE_DELAY);

  // Ref to track if component is mounted
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch students smoothly
  const fetchStudents = useCallback(async () => {
    try {
      const response = await api.getStudents({
        page: currentPage,
        per_page: ITEMS_PER_PAGE,
        search: debouncedSearch,
        filter: debouncedFilter,
        sort: sortParams.sort,
        order: sortParams.order,
      });

      if (isMountedRef.current) {
        setStudents(response.data.items || []);
        setTotalPages(response.data.pages || 1);
        setTotalItems(response.data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      if (isMountedRef.current) {
        showErrorToast(error.response?.data?.error || 'Failed to load students.');
        setStudents([]);
      }
    }
  }, [currentPage, debouncedSearch, debouncedFilter, sortParams]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Event handlers
  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
    setHasSearched(true);
  };

  const handleClearSearch = () => {
    setSearchParams({ search: '', filter: 'all' });
    setHasSearched(false);
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    setSortParams((prev) => ({
      sort: field,
      order: prev.sort === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (student) => {
    const result = await showConfirmDialog({
      title: 'Delete Student?',
      text: `Are you sure you want to delete ${student.firstname} ${student.lastname}? This action cannot be undone.`
    });

    if (result.isConfirmed) {
      const previousStudents = [...students];
      setStudents((prev) => prev.filter((s) => s.id !== student.id));

      try {
        await api.deleteStudent(student.id);
        showSuccessToast('Student deleted successfully!');
        fetchStudents();
      } catch (error) {
        console.error('Error deleting student:', error);
        setStudents(previousStudents);
        showErrorToast(error.response?.data?.error || 'Failed to delete student.');
      }
    }
  };

  const handleFormSuccess = (studentData, operation, hasPhoto = false) => {
    if (operation === 'update' && studentData && originalEditingId) {
      setStudents((prev) =>
        prev.map((student) =>
          student.id === originalEditingId ? studentData : student
        )
      );
    } else if (operation === 'create') {
      if (currentPage === 1) {
        setStudents((prev) => [studentData, ...prev]);
        setTotalItems((prev) => prev + 1);
      }
      setTimeout(() => fetchStudents(), 100);
    } else if (operation === 'photo_update' && studentData) {
      setStudents((prev) =>
        prev.map((student) =>
          student.id === studentData.id ? { ...student, ...studentData } : student
        )
      );

      if (editingStudent?.id === studentData.id) {
        setEditingStudent({ ...editingStudent, ...studentData });
      }
    } else if (operation === 'photo_update_no_close' && studentData) {
      // Update student data but keep modal open
      setStudents((prev) =>
        prev.map((student) =>
          student.id === studentData.id ? { ...student, ...studentData } : student
        )
      );

      if (editingStudent?.id === studentData.id) {
        setEditingStudent({ ...editingStudent, ...studentData });
      }

      // Mark that we just uploaded a photo - toast will show when modal closes
      setJustUploadedPhoto(true);
      return; // Don't close modal
    } else if (operation === 'photo_remove_no_close' && studentData) {
      // Update student data but keep modal open
      setStudents((prev) =>
        prev.map((student) =>
          student.id === studentData.id ? { ...student, ...studentData } : student
        )
      );

      if (editingStudent?.id === studentData.id) {
        setEditingStudent({ ...editingStudent, ...studentData });
      }

      // Mark that we just removed a photo - toast will show when modal closes
      setJustRemovedPhoto(true);
      return; // Don't close modal
    } else {
      fetchStudents();
    }

    // Show success message after modal closes
    if (operation === 'create' || operation === 'update') {
      setJustSubmittedForm({ operation, hasPhoto });
    }

    closeModal();
  };

  // Modal handlers
  const openAddModal = () => {
    setEditingStudent(null);
    setOriginalEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = async (student) => {
    setOriginalEditingId(student.id);

    try {
      const response = await api.getStudent(student.id);
      setEditingStudent(response.data);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching student:', error);
      setEditingStudent(student);
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    if (justUploadedPhoto) {
      showSuccessToast("Photo uploaded successfully!");
      setJustUploadedPhoto(false);
    }

    if (justRemovedPhoto) {
      showSuccessToast("Photo removed successfully!");
      setJustRemovedPhoto(false);
    }

    if (justSubmittedForm) {
      const { operation, hasPhoto } = justSubmittedForm;
      const photoMessage = hasPhoto ? " with photo" : "";
      const message = operation === 'create'
        ? `Student created successfully${photoMessage}!`
        : `Student updated successfully${photoMessage}!`;
      showSuccessToast(message);
      setJustSubmittedForm(null);
    }

    setIsModalOpen(false);
    setEditingStudent(null);
    setOriginalEditingId(null);
  };

  // Render helpers
  const renderSortIcon = (field) => {
    if (sortParams.sort !== field) return null;
    return sortParams.order === 'asc' ? <FiArrowUp /> : <FiArrowDown />;
  };

  const getSortHeaderStyle = (field) => ({
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ...(sortParams.sort === field && {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      color: '#fff',
      fontWeight: 'bold'
    })
  });

  const renderEmptyState = () => {
    const hasActiveSearch = searchParams.search || searchParams.filter !== 'all';
    
    return (
      <tr>
        <td colSpan="8" className="empty-state">
          <div className="empty-state-icon">
            {hasSearched && hasActiveSearch ? '🔍' : '👥'}
          </div>
          <div className="empty-state-text">
            {hasSearched && hasActiveSearch
              ? `No students found matching "${searchParams.search}" in ${
                  searchParams.filter === 'all' ? 'all fields' : searchParams.filter
                }.`
              : 'No students found. Add your first student to get started!'}
          </div>
          {hasSearched && hasActiveSearch && (
            <button className="btn btn-primary mt-3" onClick={handleClearSearch}>
              Clear Search
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="main-header">
        <h1 className="header-title">Students</h1>
        <div className="header-actions" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {/* Search & Filter */}
          <div className="search-container" style={{ width: 380 }}>
            <div className="search-input-container">
              {/* Filter Dropdown */}
              <div className={`filter-dropdown ${searchParams.filter !== 'all' ? 'filter-active' : ''}`}>
                <select
                  name="filter"
                  value={searchParams.filter}
                  onChange={handleSearchChange}
                  className="form-control"
                  aria-label="Filter search field"
                >
                  {FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <FiChevronDown className="dropdown-icon" aria-hidden="true" />
              </div>

              {/* Search Input */}
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  className="form-control search-input"
                  name="search"
                  placeholder="Search students..."
                  value={searchParams.search}
                  onChange={handleSearchChange}
                  aria-label={`Search students by ${searchParams.filter}`}
                  autoComplete="off"
                  style={{ paddingRight: '3rem' }}
                />
                <FiSearch className="search-icon" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* Add Button */}
          <button className="btn add-btn" onClick={openAddModal}>
            <span className="add-icon" aria-hidden="true">＋</span>
            Add Student
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="col-avatar">Photo</th>
              {SORTABLE_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className={`col-${column.key}`}
                  onClick={() => handleSort(column.key)}
                  style={getSortHeaderStyle(column.key)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => e.key === 'Enter' && handleSort(column.key)}
                  aria-sort={sortParams.sort === column.key ? sortParams.order : 'none'}
                >
                  {column.label} {renderSortIcon(column.key)}
                </th>
              ))}
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.length > 0 ? (
              students.map((student) => (
                <tr key={student.id} className="student-row">
                  <td className="avatar-container">
                    <StudentAvatar
                      key={`${student.id}-${student.profile_photo_url || 'no-photo'}`}
                      student={student}
                      size={90}
                    />
                  </td>
                  <td>{student.id || 'N/A'}</td>
                  <td>{student.firstname || 'N/A'}</td>
                  <td>{student.lastname || 'N/A'}</td>
                  <td>{student.course || 'N/A'}</td>
                  <td>{student.year || 'N/A'}</td>
                  <td>{student.gender || 'N/A'}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => openEditModal(student)}
                        aria-label={`Edit ${student.firstname} ${student.lastname}`}
                      >
                        <FiEdit size={14} aria-hidden="true" /> Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(student)}
                        aria-label={`Delete ${student.firstname} ${student.lastname}`}
                      >
                        <FiTrash2 size={14} aria-hidden="true" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              renderEmptyState()
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        entityType="students"
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingStudent ? 'Edit Student' : 'Add Student'}
      >
        <StudentForm
          onSuccess={handleFormSuccess}
          student={editingStudent}
          onClose={closeModal}
        />
      </Modal>
    </div>
  );
};

export default StudentList;
