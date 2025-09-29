import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { showConfirmDialog, showSuccessToast, showErrorToast } from '../utils/alert';
import Modal from '../components/Modal';
import StudentForm from './StudentForm';

const StudentList = () => {
    const [students, setStudents] = useState([]);
    const [searchParams, setSearchParams] = useState({ search: '' });
    const [sortParams, setSortParams] = useState({ sort: 'id', order: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);

    const fetchStudents = useCallback(async () => {
        try {
            const response = await api.getStudents({
                page: currentPage,
                per_page: 10,
                search: searchParams.search,
                sort: sortParams.sort,
                order: sortParams.order,
            });
            setStudents(response.data.items);
            setTotalPages(response.data.pages);
        } catch (error) {
            showErrorToast('Error fetching students.');
            console.error("Error fetching students:", error);
        }
    }, [currentPage, searchParams, sortParams]);

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
                fetchStudents(); // Refresh the list
            } catch (error) {
                showErrorToast(error.response?.data?.error || 'Error deleting student.');
            }
        }
    };
    
    const handleFormSuccess = () => {
        fetchStudents(); // Refresh the list
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
                <h1>Students</h1>
                <div className="search-bar"><input type="text" className="form-control" name="search" placeholder="Search by name or ID" value={searchParams.search} onChange={handleSearchChange} /></div>
                <button className="btn btn-primary" onClick={openAddModal}>Add Student</button>
            </div>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('id')}>ID {renderSortArrow('id')}</th>
                            <th onClick={() => handleSort('firstname')}>First Name {renderSortArrow('firstname')}</th>
                            <th onClick={() => handleSort('lastname')}>Last Name {renderSortArrow('lastname')}</th>
                            <th onClick={() => handleSort('course')}>Course {renderSortArrow('course')}</th>
                            <th onClick={() => handleSort('year')}>Year {renderSortArrow('year')}</th>
                            <th onClick={() => handleSort('gender')}>Gender {renderSortArrow('gender')}</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students && students.length > 0 ? (
                            students.map((student) => (
                                <tr key={student.id}>
                                    <td>{student.id}</td><td>{student.firstname}</td><td>{student.lastname}</td><td>{student.course}</td><td>{student.year}</td><td>{student.gender}</td>
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
