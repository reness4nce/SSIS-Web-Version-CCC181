import React, { useState, useEffect } from "react";
import api from "../services/api"; // ✅ our API wrapper
import { showSuccessToast, showErrorToast } from "../utils/alert";

function StudentForm({ onSuccess, student, onClose }) {
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
  const [isCheckingId, setIsCheckingId] = useState(false);

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

  // ✅ Debounced ID validation
  useEffect(() => {
    // Only validate for new students OR when editing and ID has changed from original
    const shouldValidateId = formData.id &&
                            /^[0-9]{4}-[0-9]{4}$/.test(formData.id) &&
                            (!isEdit || (isEdit && student && formData.id !== student.id));

    if (shouldValidateId) {
      setIsCheckingId(true);

      const timeoutId = setTimeout(async () => {
        try {
          console.log(`🔍 Checking ID: ${formData.id}, isEdit: ${isEdit}, original ID: ${student?.id}`);

          // Check if ID exists
          await api.getStudent(formData.id);

          // If we reach here, the ID exists - but we need to handle edit case differently
          if (isEdit && student && formData.id === student.id) {
            // This is the current student's ID - it's valid
            console.log(`✅ Current student's ID - valid`);
            setFieldErrors(prev => ({ ...prev, id: null }));
          } else {
            // ID exists and it's not the current student's ID
            console.log(`❌ ID exists and not current student - duplicate`);
            setFieldErrors(prev => ({
              ...prev,
              id: "This Student ID already exists. Please use a unique ID."
            }));
          }
        } catch (err) {
          // If we get a 404, the ID is available
          if (err.response?.status === 404) {
            console.log(`✅ ID available (404 received)`);
            setFieldErrors(prev => ({ ...prev, id: null }));
          } else {
            // For other errors (network, server, etc.), clear any existing ID error
            // The form submission will handle these errors
            console.log(`⚠️ Other error during ID check:`, err.response?.status, err.message);
            setFieldErrors(prev => ({ ...prev, id: null }));
          }
        } finally {
          setIsCheckingId(false);
        }
      }, 500); // Wait 500ms after user stops typing

      return () => clearTimeout(timeoutId);
    } else {
      setIsCheckingId(false);
      // Clear ID error if validation conditions aren't met
      if (!shouldValidateId) {
        setFieldErrors(prev => ({ ...prev, id: null }));
      }
    }
  }, [formData.id, isEdit, student]);

  const handleChange = (e) => {
    setErrorMessage("");
    setFieldErrors(prev => ({ ...prev, [e.target.name]: null }));
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Enhanced validation function
  const validateForm = () => {
    const errors = {};

    // ID validation (for both new students and when editing with changed ID)
    if (!formData.id) {
      errors.id = "Student ID is required";
    } else if (!formData.id.includes('-')) {
      errors.id = "Student ID must include a dash (e.g., 2024-0001)";
    } else if (!/^[0-9]{4}-[0-9]{4}$/.test(formData.id)) {
      errors.id = "Student ID must follow format YYYY-NNNN (e.g., 2024-0001)";
    } else if (isEdit && student && formData.id !== student.id) {
      // For editing: if ID is different from original, check for duplicates
      // The real-time validation should catch this, but this is a backup
      errors.id = "Please ensure the Student ID is unique before submitting.";
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

    // Additional check: if editing and ID changed, ensure no duplicate ID error exists
    if (isEdit && student && formData.id !== student.id && fieldErrors.id) {
      showErrorToast("Please fix the Student ID error before submitting.");
      return;
    }

    try {
      if (isEdit) {
        // Use original student ID in URL, updated data in body
        await api.updateStudent(student.id, formData);
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
          const errorLower = error.toLowerCase();

          // Enhanced duplicate ID detection
          if (errorLower.includes("duplicate") && errorLower.includes("id")) {
            errors.id = "This Student ID already exists. Please use a unique ID.";
          } else if (errorLower.includes("unique") && errorLower.includes("id")) {
            errors.id = "This Student ID is already taken. Please choose a different ID.";
          } else if (errorLower.includes("id") && errorLower.includes("exist")) {
            errors.id = "A student with this ID already exists in the system.";
          } else if (errorLower.includes("id") || errorLower.includes("student id")) {
            errors.id = error;
          } else if (errorLower.includes("firstname") || errorLower.includes("first name")) {
            errors.firstname = error;
          } else if (errorLower.includes("lastname") || errorLower.includes("last name")) {
            errors.lastname = error;
          } else if (errorLower.includes("course") || errorLower.includes("program") || errorLower.includes("invalid program")) {
            errors.course = error;
          } else if (errorLower.includes("year")) {
            errors.year = error;
          } else if (errorLower.includes("gender")) {
            errors.gender = error;
          } else {
            // If we can't categorize the error, show it as a general message
            setErrorMessage(error);
          }
        });
        setFieldErrors(errors);
      } else if (err.response?.data?.error) {
        const errorLower = err.response.data.error.toLowerCase();

        // Handle duplicate ID in general error message
        if (errorLower.includes("duplicate") && errorLower.includes("id")) {
          setFieldErrors({ id: "This Student ID already exists. Please use a unique ID." });
        } else if (errorLower.includes("unique") && errorLower.includes("id")) {
          setFieldErrors({ id: "This Student ID is already taken. Please choose a different ID." });
        } else {
          setErrorMessage(err.response.data.error);
        }
      } else if (err.response?.data?.message) {
        const messageLower = err.response.data.message.toLowerCase();

        // Handle duplicate ID in message field
        if (messageLower.includes("duplicate") && messageLower.includes("id")) {
          setFieldErrors({ id: "This Student ID already exists. Please use a unique ID." });
        } else if (messageLower.includes("unique") && messageLower.includes("id")) {
          setFieldErrors({ id: "This Student ID is already taken. Please choose a different ID." });
        } else {
          setErrorMessage(err.response.data.message);
        }
      } else if (err.message) {
        setErrorMessage(`Network error: ${err.message}`);
      } else {
        setErrorMessage("Failed to save student. Please check your input and try again.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="modal-form">
      {errorMessage && (
        <div className="modal-error" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="student-id" className="form-label">
          Student ID
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="student-id"
            name="id"
            className="form-control"
            placeholder="e.g., 2024-0001"
            value={formData.id}
            onChange={handleChange}
            required
            aria-describedby={fieldErrors.id ? "id-error" : undefined}
            style={{ paddingRight: isCheckingId ? '50px' : '16px' }}
          />
          {isCheckingId && (
            <div style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)'
            }}>
              <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true">
                <span className="visually-hidden">Checking ID...</span>
              </div>
            </div>
          )}
        </div>
        {fieldErrors.id && (
          <span id="id-error" className="modal-field-error" role="alert">
            {fieldErrors.id}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="student-firstname" className="form-label">
          First Name
        </label>
        <input
          id="student-firstname"
          name="firstname"
          className="form-control"
          placeholder="Enter first name"
          value={formData.firstname}
          onChange={handleChange}
          required
          aria-describedby={fieldErrors.firstname ? "firstname-error" : undefined}
        />
        {fieldErrors.firstname && (
          <span id="firstname-error" className="modal-field-error" role="alert">
            {fieldErrors.firstname}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="student-lastname" className="form-label">
          Last Name
        </label>
        <input
          id="student-lastname"
          name="lastname"
          className="form-control"
          placeholder="Enter last name"
          value={formData.lastname}
          onChange={handleChange}
          required
          aria-describedby={fieldErrors.lastname ? "lastname-error" : undefined}
        />
        {fieldErrors.lastname && (
          <span id="lastname-error" className="modal-field-error" role="alert">
            {fieldErrors.lastname}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="student-program" className="form-label">
          Program
        </label>
        <select
          id="student-program"
          name="course"
          className="form-control"
          value={formData.course}
          onChange={handleChange}
          required
          aria-describedby={fieldErrors.course ? "course-error" : undefined}
        >
          <option value="">Select a program</option>
          {programs.map((program) => (
            <option key={program.code} value={program.code}>
              {program.name}
            </option>
          ))}
        </select>
        {fieldErrors.course && (
          <span id="course-error" className="modal-field-error" role="alert">
            {fieldErrors.course}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="student-year" className="form-label">
          Year Level
        </label>
        <input
          id="student-year"
          name="year"
          type="number"
          className="form-control"
          placeholder="1-4"
          min="1"
          max="4"
          value={formData.year}
          onChange={handleChange}
          required
          aria-describedby={fieldErrors.year ? "year-error" : undefined}
        />
        {fieldErrors.year && (
          <span id="year-error" className="modal-field-error" role="alert">
            {fieldErrors.year}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="student-gender" className="form-label">
          Gender
        </label>
        <select
          id="student-gender"
          name="gender"
          className="form-control"
          value={formData.gender}
          onChange={handleChange}
          required
          aria-describedby={fieldErrors.gender ? "gender-error" : undefined}
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Non-binary">Non-binary</option>
          <option value="Prefer not to say">Prefer not to say</option>
          <option value="Other">Other</option>
        </select>
        {fieldErrors.gender && (
          <span id="gender-error" className="modal-field-error" role="alert">
            {fieldErrors.gender}
          </span>
        )}
      </div>

      <div className="modal-footer">
        <button
          type="button"
          className="modal-btn modal-btn-secondary"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="modal-btn modal-btn-primary"
          disabled={!formData.id.trim() || !formData.firstname.trim() || !formData.lastname.trim() ||
                   !formData.course.trim() || !formData.year || !formData.gender}
        >
          {isEdit ? "Update Student" : "Add Student"}
        </button>
      </div>
    </form>
  );
}

export default StudentForm;
