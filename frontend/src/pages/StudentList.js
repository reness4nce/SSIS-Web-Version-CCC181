import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';
import { FiArrowUp, FiArrowDown, FiSearch, FiChevronDown } from 'react-icons/fi';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // Debounced search and filter
  const [debouncedSearch] = useDebounce(searchParams.search, 300);
  const [debouncedFilter] = useDebounce(searchParams.filter, 300);

  const fetchStudents = useCallback(async () => {
    try {
      const response = await api.getStudents({
        page: currentPage,
        per_page: 10,
        search: debouncedSearch,
        filter: debouncedFilter,
        sort: sortParams.sort,
        order: sortParams.order,
      });
      setStudents(response.data.items);
      setTotalPages(response.data.pages);
    } catch (error) {
      showErrorToast('Error fetching students.');
      console.error("Error fetching students:", error);
    }
  }, [currentPage, debouncedSearch, debouncedFilter, sortParams]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSearchChange = (e) => {
    setSearchParams({ ...searchParams, [e.target.name]: e.target.value });
    setCurrentPage(1);
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

  const handleFormSuccess = () => {
    fetchStudents();
    closeModal();
  };

  const openAddModal = () => { setEditingStudent(null); setIsModalOpen(true); };
  const openEditModal = (student) => { setEditingStudent(student); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditingStudent(null); };

  const renderSortArrow = (field) => {
    if (sortParams.sort === field) {
      return sortParams.order === 'asc' ? <FiArrowUp /> : <FiArrowDown />;
    }
    return null;
  };

  return (
    <div>
      <div className="main-header">
        <h1 className="header-title">Students</h1>
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
                <option value="id">Student ID</option>
                <option value="firstname">First Name</option>
                <option value="lastname">Last Name</option>
                <option value="course">Course</option>
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
            <span className="add-icon" aria-hidden="true">＋</span> Add Student
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>ID {renderSortArrow('id')}</th>
              <th onClick={() => handleSort('firstname')} style={{ cursor: 'pointer' }}>First Name {renderSortArrow('firstname')}</th>
              <th onClick={() => handleSort('lastname')} style={{ cursor: 'pointer' }}>Last Name {renderSortArrow('lastname')}</th>
              <th onClick={() => handleSort('course')} style={{ cursor: 'pointer' }}>Course {renderSortArrow('course')}</th>
              <th onClick={() => handleSort('year')} style={{ cursor: 'pointer' }}>Year {renderSortArrow('year')}</th>
              <th onClick={() => handleSort('gender')} style={{ cursor: 'pointer' }}>Gender {renderSortArrow('gender')}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students && students.length > 0 ? (
              students.map((student) => (
                <tr key={student.id}>
                  <td>{student.id}</td>
                  <td>{student.firstname}</td>
                  <td>{student.lastname}</td>
                  <td>{student.course}</td>
                  <td>{student.year}</td>
                  <td>{student.gender}</td>
                  <td>
                    <button className="btn btn-warning btn-sm" onClick={() => openEditModal(student)}>Edit</button>
                    <button className="btn btn-danger btn-sm ml-2" onClick={() => handleDelete(student.id)}>Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="empty-state">
                  <div className="empty-state-icon">👥</div>
                  <div className="empty-state-text">No students found.</div>
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
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingStudent ? 'Edit Student' : 'Add Student'}>
        <StudentForm onSuccess={handleFormSuccess} student={editingStudent} />
      </Modal>
    </div>
  );
};

export default StudentList;
