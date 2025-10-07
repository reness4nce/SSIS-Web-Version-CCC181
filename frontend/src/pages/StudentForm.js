import React, { useState, useEffect } from "react";
import api from "../services/api"; // ✅ our API wrapper
import { showSuccessToast } from "../utils/alert";

function StudentForm({ onSuccess, student }) {
  const isEdit = !!student;

  const [formData, setFormData] = useState({
    id: "",
    firstname: "",
    lastname: "",
    course: "",
    year: "",
    gender: "",
  });

  const [programs, setPrograms] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // ✅ Fetch available programs for the dropdown
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await api.getPrograms({ page: 1, per_page: 100 }); // Get all programs for dropdown
        setPrograms(res.data.items || []);
      } catch (err) {
        console.error("Failed to fetch programs:", err);
        setPrograms([]);
      }
    };
    fetchPrograms();
  }, []);

  // ✅ Populate form if editing
  useEffect(() => {
    if (isEdit && student) {
      setFormData(student);
    } else {
      setFormData({
        id: "",
        firstname: "",
        lastname: "",
        course: "",
        year: "",
        gender: "",
      });
    }
  }, [student, isEdit]);

  const handleChange = (e) => {
    setErrorMessage("");
    setFieldErrors(prev => ({ ...prev, [e.target.name]: null }));
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Enhanced validation function
  const validateForm = () => {
    const errors = {};

    // ID validation (only for new students)
    if (!isEdit) {
      if (!formData.id) {
        errors.id = "Student ID is required";
      } else if (!formData.id.includes('-')) {
        errors.id = "Student ID must include a dash (e.g., 2024-0001)";
      } else if (!/^[0-9]{4}-[0-9]{4}$/.test(formData.id)) {
        errors.id = "Student ID must follow format YYYY-NNNN (e.g., 2024-0001)";
      }
    }

    // Name validations
    if (!formData.firstname) {
      errors.firstname = "First name is required";
    } else if (formData.firstname.length < 2) {
      errors.firstname = "First name must be at least 2 characters";
    } else if (!/^[a-zA-Z\s'-]+$/.test(formData.firstname)) {
      errors.firstname = "First name can only contain letters, spaces, hyphens, and apostrophes";
    }

    if (!formData.lastname) {
      errors.lastname = "Last name is required";
    } else if (formData.lastname.length < 2) {
      errors.lastname = "Last name must be at least 2 characters";
    } else if (!/^[a-zA-Z\s'-]+$/.test(formData.lastname)) {
      errors.lastname = "Last name can only contain letters, spaces, hyphens, and apostrophes";
    }

    // Course validation
    if (!formData.course) {
      errors.course = "Program selection is required";
    }

    // Year validation
    if (!formData.year) {
      errors.year = "Year is required";
    } else {
      const yearNum = parseInt(formData.year);
      if (isNaN(yearNum) || yearNum < 1 || yearNum > 6) {
        errors.year = "Year must be a number between 1 and 6";
      }
    }

    // Gender validation
    if (!formData.gender) {
      errors.gender = "Gender selection is required";
    }

    return errors;
  };

  // ✅ Submit (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setFieldErrors({});

    // Enhanced client-side validation
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    try {
      if (isEdit) {
        await api.updateStudent(formData.id, formData);
        showSuccessToast("Student updated successfully!");
      } else {
        await api.createStudent(formData);
        showSuccessToast("Student created successfully!");
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Failed to save student:", err);
      console.log("Error response:", err.response?.data); // Debug logging

      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        // Handle field-specific errors from backend
        const errors = {};
        err.response.data.errors.forEach(error => {
          // Extract field name from error message if possible
          if (error.toLowerCase().includes("id") || error.toLowerCase().includes("student id")) {
            errors.id = error;
          } else if (error.toLowerCase().includes("firstname") || error.toLowerCase().includes("first name")) {
            errors.firstname = error;
          } else if (error.toLowerCase().includes("lastname") || error.toLowerCase().includes("last name")) {
            errors.lastname = error;
          } else if (error.toLowerCase().includes("course") || error.toLowerCase().includes("program") || error.toLowerCase().includes("invalid program")) {
            errors.course = error;
          } else if (error.toLowerCase().includes("year")) {
            errors.year = error;
          } else if (error.toLowerCase().includes("gender")) {
            errors.gender = error;
          } else {
            // If we can't categorize the error, show it as a general message
            setErrorMessage(error);
          }
        });
        setFieldErrors(errors);
      } else if (err.response?.data?.error) {
        setErrorMessage(err.response.data.error);
      } else if (err.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else if (err.message) {
        setErrorMessage(`Network error: ${err.message}`);
      } else {
        setErrorMessage("Failed to save student. Please check your input and try again.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {errorMessage && (
        <div className="alert alert-danger mb-3" role="alert">
          {errorMessage}
        </div>
      )}
      <div className="mb-3">
        <label>ID</label>
        <input
          name="id"
          className="form-control"
          placeholder="e.g., 2024-0001"
          value={formData.id}
          onChange={handleChange}
          required
        />
        {fieldErrors.id && <div className="text-danger mt-1">{fieldErrors.id}</div>}
      </div>
      <div className="mb-3">
        <label>First Name</label>
        <input
          name="firstname"
          className="form-control"
          value={formData.firstname}
          onChange={handleChange}
          required
        />
        {fieldErrors.firstname && <div className="text-danger mt-1">{fieldErrors.firstname}</div>}
      </div>
      <div className="mb-3">
        <label>Last Name</label>
        <input
          name="lastname"
          className="form-control"
          value={formData.lastname}
          onChange={handleChange}
          required
        />
        {fieldErrors.lastname && <div className="text-danger mt-1">{fieldErrors.lastname}</div>}
      </div>
      <div className="mb-3">
        <label>Program</label>
        <select
          name="course"
          className="form-control"
          value={formData.course}
          onChange={handleChange}
          required
        >
          <option value="">Select a program</option>
          {programs.map((program) => (
            <option key={program.code} value={program.code}>
              {program.name}
            </option>
          ))}
        </select>
        {fieldErrors.course && <div className="text-danger mt-1">{fieldErrors.course}</div>}
      </div>
      <div className="mb-3">
        <label>Year</label>
        <input
          name="year"
          type="number"
          className="form-control"
          value={formData.year}
          onChange={handleChange}
          required
        />
        {fieldErrors.year && <div className="text-danger mt-1">{fieldErrors.year}</div>}
      </div>
      <div className="mb-3">
        <label>Gender</label>
        <select
          name="gender"
          className="form-control"
          value={formData.gender}
          onChange={handleChange}
          required
          aria-label="Select gender"
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Non-binary">Non-binary</option>
          <option value="Prefer not to say">Prefer not to say</option>
          <option value="Other">Other</option>
        </select>
        {fieldErrors.gender && <div className="text-danger mt-1">{fieldErrors.gender}</div>}
      </div>
      <div className="modal-footer">
        <button className="btn btn-primary" type="submit">
          {isEdit ? "Update" : "Add"}
        </button>
      </div>
    </form>
  );
}

export default StudentForm;
