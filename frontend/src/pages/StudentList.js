import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';
import { FiArrowUp, FiArrowDown, FiSearch, FiChevronDown, FiEdit, FiTrash2 } from 'react-icons/fi';
import { showConfirmDialog, showSuccessToast, showErrorToast } from '../utils/alert';
import Modal from '../components/Modal';
import StudentForm from './StudentForm';
import { useDebounce } from 'use-debounce'; // Install with: npm i use-debounce

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [searchParams, setSearchParams] = useState({ search: '', filter: 'all' });
  const [sortParams, setSortParams] = useState({ sort: 'id', order: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [originalEditingId, setOriginalEditingId] = useState(null); // For tracking ID changes in edit
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search and filter
  const [debouncedSearch] = useDebounce(searchParams.search, 300);
  const [debouncedFilter] = useDebounce(searchParams.filter, 300);

  const fetchStudents = useCallback(async () => {
    try {
      const response = await api.getStudents({
        page: currentPage,
        per_page: 10,
        search: debouncedSearch,  // Use debounced values for better performance
        filter: debouncedFilter,
        sort: sortParams.sort,
        order: sortParams.order,
      });
      setStudents(response.data.items);
      setTotalPages(response.data.pages);
      setTotalItems(response.data.total);
    } catch (error) {
      showErrorToast('Error fetching students.');
      console.error("Error fetching students:", error);
    }
  }, [currentPage, debouncedSearch, debouncedFilter, sortParams.sort, sortParams.order]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

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

  const handleDelete = async (id) => {
    const result = await showConfirmDialog({ title: 'Are you sure?', text: 'This student will be permanently deleted.' });
    if (result.isConfirmed) {
      try {
        await api.deleteStudent(id);
        showSuccessToast('Student deleted successfully!');
        fetchStudents();
      } catch (error) {
        showErrorToast(error.response?.data?.error || 'Error deleting student.');
      }
    }
  };

  const handleFormSuccess = (studentData, operation) => {
    if (operation === 'update' && studentData && originalEditingId) {
      // For updates, replace the student in the current list
      // This preserves pagination, search, and filter state
      setStudents(prev =>
        prev.map(student =>
          student.id === originalEditingId ? studentData : student
        )
      );
    } else if (operation === 'create' && studentData) {
      // For new students, refresh to show the new record
      // (it might be on a different page or filtered out)
      fetchStudents();
    } else {
      // Fallback: refresh data
      fetchStudents();
    }

    // Close modal after a brief delay to allow state to update
    setTimeout(() => {
      closeModal();
    }, 100);
  };

  const openAddModal = () => { setEditingStudent(null); setIsModalOpen(true); };
  const openEditModal = async (student) => {
    // Save the original ID for handling any ID changes
    setOriginalEditingId(student.id);

    // Always fetch fresh data when opening edit modal to ensure we have latest changes
    try {
      const response = await api.getStudent(student.id);
      const freshStudent = response.data;
      setEditingStudent(freshStudent);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching fresh student data:", error);
      // Fallback to using the provided student data if fresh fetch fails
      setEditingStudent(student);
      setIsModalOpen(true);
    }
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
    setOriginalEditingId(null);
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
        <h1 className="header-title">Students</h1>
        <div className="header-actions" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div className="search-container" style={{ width: 380 }}>
            <div className={`search-input-container ${isSearching ? 'searching' : ''}`}>
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
                  <option value="id">Search by Student ID</option>
                  <option value="firstname">Search by First Name</option>
                  <option value="lastname">Search by Last Name</option>
                  <option value="course">Search by Course</option>
                </select>
                <FiChevronDown className="dropdown-icon" aria-hidden="true" />
              </div>

              {/* Enhanced Search Input */}
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  className="form-control search-input"
                  name="search"
                  placeholder="Search students..."
                  value={searchParams.search}
                  onChange={(e) => {
                    handleSearchChange(e);
                    setIsSearching(true);
                    // Reset searching state after debounce delay
                    setTimeout(() => setIsSearching(false), 350);
                  }}
                  aria-label={`Search students by ${searchParams.filter}`}
                  autoComplete="off"
                  style={{ paddingRight: '3rem' }}
                />
                <FiSearch className="search-icon" aria-hidden="true" />
                <div className="search-spinner" aria-hidden="true"></div>
              </div>
            </div>


          </div>

          <button className="btn add-btn" onClick={openAddModal}>
            <span className="add-icon" aria-hidden="true">＋</span> Add Student
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="col-id" onClick={() => handleSort('id')} style={getSortButtonStyle('id')}>
                ID {renderSortArrow('id')}
                {sortParams.sort === 'id' && (
                  <span style={{ marginLeft: '8px', fontSize: '0.8em', opacity: 0.8 }}>
                    ({sortParams.order === 'asc' ? '↑' : '↓'})
                  </span>
                )}
              </th>
              <th className="col-name" onClick={() => handleSort('firstname')} style={getSortButtonStyle('firstname')}>
                First Name {renderSortArrow('firstname')}
                {sortParams.sort === 'firstname' && (
                  <span style={{ marginLeft: '8px', fontSize: '0.8em', opacity: 0.8 }}>
                    ({sortParams.order === 'asc' ? '↑' : '↓'})
                  </span>
                )}
              </th>
              <th className="col-name" onClick={() => handleSort('lastname')} style={getSortButtonStyle('lastname')}>
                Last Name {renderSortArrow('lastname')}
                {sortParams.sort === 'lastname' && (
                  <span style={{ marginLeft: '8px', fontSize: '0.8em', opacity: 0.8 }}>
                    ({sortParams.order === 'asc' ? '↑' : '↓'})
                  </span>
                )}
              </th>
              <th className="col-course" onClick={() => handleSort('course')} style={getSortButtonStyle('course')}>
                Course {renderSortArrow('course')}
                {sortParams.sort === 'course' && (
                  <span style={{ marginLeft: '8px', fontSize: '0.8em', opacity: 0.8 }}>
                    ({sortParams.order === 'asc' ? '↑' : '↓'})
                  </span>
                )}
              </th>
              <th className="col-year" onClick={() => handleSort('year')} style={getSortButtonStyle('year')}>
                Year {renderSortArrow('year')}
                {sortParams.sort === 'year' && (
                  <span style={{ marginLeft: '8px', fontSize: '0.8em', opacity: 0.8 }}>
                    ({sortParams.order === 'asc' ? '↑' : '↓'})
                  </span>
                )}
              </th>
              <th className="col-gender" onClick={() => handleSort('gender')} style={getSortButtonStyle('gender')}>
                Gender {renderSortArrow('gender')}
                {sortParams.sort === 'gender' && (
                  <span style={{ marginLeft: '8px', fontSize: '0.8em', opacity: 0.8 }}>
                    ({sortParams.order === 'asc' ? '↑' : '↓'})
                  </span>
                )}
              </th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students && students.length > 0 ? (
              students.map((student) => (
                <tr key={student.id}>
                  <td>{student.id || 'N/A'}</td>
                  <td>{student.firstname || 'N/A'}</td>
                  <td>{student.lastname || 'N/A'}</td>
                  <td>{student.course_name || student.course || 'N/A'}</td>
                  <td>{student.year || 'N/A'}</td>
                  <td>{student.gender || 'N/A'}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => openEditModal(student)}
                        aria-label={`Edit student ${student.firstname} ${student.lastname}`}
                        title="Edit student"
                      >
                        <FiEdit size={14} aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(student.id)}
                        aria-label={`Delete student ${student.firstname} ${student.lastname}`}
                        title="Delete student"
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
                <td colSpan="7" className="empty-state">
                  <div className="empty-state-icon">
                    {hasSearched && (searchParams.search || searchParams.filter !== 'all') ? '🔍' : '👥'}
                  </div>
                  <div className="empty-state-text">
                    {hasSearched && (searchParams.search || searchParams.filter !== 'all')
                      ? `No students found matching "${searchParams.search}" in ${searchParams.filter === 'all' ? 'all fields' : searchParams.filter}.`
                      : 'No students found.'}
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
        totalItems={totalItems}
        itemsPerPage={10}
      />
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingStudent ? 'Edit Student' : 'Add Student'}>
        <StudentForm onSuccess={handleFormSuccess} student={editingStudent} onClose={closeModal} />
      </Modal>
    </div>
  );
};

export default StudentList;
