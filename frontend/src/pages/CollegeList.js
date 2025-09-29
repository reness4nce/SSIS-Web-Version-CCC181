import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { showConfirmDialog, showSuccessToast, showErrorToast } from '../utils/alert';
import Modal from '../components/Modal';
import CollegeForm from './CollegeForm';

const CollegeList = () => {
    const [colleges, setColleges] = useState([]);
    const [searchParams, setSearchParams] = useState({ search: '' });
    const [sortParams, setSortParams] = useState({ sort: 'code', order: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCollege, setEditingCollege] = useState(null);

    const fetchColleges = useCallback(async () => {
        try {
            const response = await api.getColleges({
                page: currentPage,
                per_page: 10,
                search: searchParams.search,
                sort: sortParams.sort,
                order: sortParams.order,
            });
            setColleges(response.data.items);
            setTotalPages(response.data.pages);
        } catch (error) {
            showErrorToast('Error fetching colleges.');
            console.error("Error fetching colleges:", error);
        }
    }, [currentPage, searchParams, sortParams]);

    useEffect(() => {
        fetchColleges();
    }, [fetchColleges]);

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

    const handleDelete = async (code) => {
        const result = await showConfirmDialog({ title: 'Are you sure?', text: 'This college will be permanently deleted.' });
        if (result.isConfirmed) {
            try {
                await api.deleteCollege(code);
                showSuccessToast('College deleted successfully!');
                fetchColleges(); // Refresh the list
            } catch (error) {
                showErrorToast(error.response?.data?.error || 'Error deleting college.');
            }
        }
    };

    const handleFormSuccess = () => {
        fetchColleges(); // Refresh the list
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

    return (
        <div>
            <div className="main-header">
                <h1>Colleges</h1>
                <div className="search-bar"><input type="text" className="form-control" name="search" placeholder="Search by name or code" value={searchParams.search} onChange={handleSearchChange} /></div>
                <button className="btn btn-primary" onClick={openAddModal}>Add College</button>
            </div>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('code')}>Code {renderSortArrow('code')}</th>
                            <th onClick={() => handleSort('name')}>Name {renderSortArrow('name')}</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {colleges && colleges.length > 0 ? (
                            colleges.map((college) => (
                                <tr key={college.code}>
                                    <td>{college.code}</td><td>{college.name}</td>
                                    <td>
                                        <button className="btn btn-warning btn-sm" onClick={() => openEditModal(college)}>Edit</button>
                                        <button className="btn btn-danger btn-sm ml-2" onClick={() => handleDelete(college.code)}>Delete</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" className="empty-state">
                                    <div className="empty-state-icon">🏛️</div>
                                    <div className="empty-state-text">No colleges found.</div>
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
            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCollege ? 'Edit College' : 'Add College'}><CollegeForm onSuccess={handleFormSuccess} college={editingCollege} /></Modal>
        </div>
    );
};

export default CollegeList;
