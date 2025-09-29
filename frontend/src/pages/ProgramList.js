import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { showConfirmDialog, showSuccessToast, showErrorToast } from '../utils/alert';
import Modal from '../components/Modal';
import ProgramForm from './ProgramForm';

const ProgramList = () => {
    const [programs, setPrograms] = useState([]);
    const [searchParams, setSearchParams] = useState({ search: '' });
    const [sortParams, setSortParams] = useState({ sort: 'code', order: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProgram, setEditingProgram] = useState(null);

    const fetchPrograms = useCallback(async () => {
        try {
            const response = await api.getPrograms({
                page: currentPage,
                per_page: 10,
                search: searchParams.search,
                sort: sortParams.sort,
                order: sortParams.order,
            });
            setPrograms(response.data.items);
            setTotalPages(response.data.pages);
        } catch (error) {
            showErrorToast('Error fetching programs.');
            console.error("Error fetching programs:", error);
        }
    }, [currentPage, searchParams, sortParams]);

    useEffect(() => {
        fetchPrograms();
    }, [fetchPrograms]);

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
        const result = await showConfirmDialog({ title: 'Are you sure?', text: 'This program will be permanently deleted.' });
        if (result.isConfirmed) {
            try {
                await api.deleteProgram(code);
                showSuccessToast('Program deleted successfully!');
                fetchPrograms(); // Refresh the list
            } catch (error) {
                showErrorToast(error.response?.data?.error || 'Error deleting program.');
            }
        }
    };

    const handleFormSuccess = () => {
        fetchPrograms(); // Refresh the list
        closeModal();
    };

    const openAddModal = () => { setEditingProgram(null); setIsModalOpen(true); };
    const openEditModal = (program) => { setEditingProgram(program); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingProgram(null); };
    const renderSortArrow = (field) => {
        if (sortParams.sort === field) {
            return sortParams.order === 'asc' ? <FiArrowUp /> : <FiArrowDown />;
        }
        return null;
    };

    return (
        <div>
            <div className="main-header">
                <h1>Programs</h1>
                <div className="search-bar"><input type="text" className="form-control" name="search" placeholder="Search by name or code" value={searchParams.search} onChange={handleSearchChange} /></div>
                <button className="btn btn-primary" onClick={openAddModal}>Add Program</button>
            </div>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('code')}>Code {renderSortArrow('code')}</th>
                            <th onClick={() => handleSort('name')}>Name {renderSortArrow('name')}</th>
                            <th onClick={() => handleSort('college')}>College {renderSortArrow('college')}</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {programs && programs.length > 0 ? (
                            programs.map((program) => (
                                <tr key={program.code}>
                                    <td>{program.code}</td><td>{program.name}</td><td>{program.college}</td>
                                    <td>
                                        <button className="btn btn-warning btn-sm" onClick={() => openEditModal(program)}>Edit</button>
                                        <button className="btn btn-danger btn-sm ml-2" onClick={() => handleDelete(program.code)}>Delete</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="empty-state">
                                    <div className="empty-state-icon">📚</div>
                                    <div className="empty-state-text">No programs found.</div>
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
            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingProgram ? 'Edit Program' : 'Add Program'}><ProgramForm onSuccess={handleFormSuccess} program={editingProgram} /></Modal>
        </div>
    );
};

export default ProgramList;
