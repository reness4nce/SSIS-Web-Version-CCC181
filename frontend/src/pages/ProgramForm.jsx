import React, { useState, useEffect } from "react";
import api from "../services/api";
import { showSuccessToast } from "../utils/alert";

function ProgramForm({ onSuccess, program, onClose, originalCode }) {
  const operation = program ? 'update' : 'create';
  const isEdit = !!program;

  const [formData, setFormData] = useState({ code: "", name: "", college: "" });
  const [colleges, setColleges] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const res = await api.getColleges({ page: 1, per_page: 100 }); // Get all colleges for dropdown
        setColleges(res.data.items || []);
      } catch (err) {
        console.error("Failed to fetch colleges:", err);
        setColleges([]);
      }
    };
    fetchColleges();
  }, []);

  useEffect(() => {
    if (isEdit && program) {
      // Handle orphaned programs (college is null)
      const safeProgram = {
        ...program,
        college: program.college || "" // Convert null to empty string for form
      };
      setFormData(safeProgram);
    } else {
      setFormData({ code: "", name: "", college: "" });
    }
  }, [program, isEdit]);

  const handleChange = (e) => {
    setErrorMessage("");
    setFieldErrors(prev => ({ ...prev, [e.target.name]: null }));
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Enhanced validation function
  const validateForm = () => {
    const errors = {};

    if (!formData.code?.trim()) {
      errors.code = "Program code is required";
    }

    if (!formData.name?.trim()) {
      errors.name = "Program name is required";
    } else if (formData.name.trim().length < 3) {
      errors.name = "Program name must be at least 3 characters";
    }

    if (!formData.college?.trim()) {
      errors.college = "College selection is required";
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setFieldErrors({});

    // Client-side validation
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    try {
      let response;
      if (isEdit) {
        // Use original program code in URL, updated data in body
        const codeToUse = originalCode || program.code;
        response = await api.updateProgram(codeToUse, formData);
        showSuccessToast("Program updated successfully!");
      } else {
        response = await api.createProgram(formData);
        showSuccessToast("Program created successfully!");
      }

      // Pass the updated/created program data and operation type to the callback for in-place updates
      if (onSuccess) {
        const programData = response.data.program;
        onSuccess(programData, operation);
      }
    } catch (err) {
      console.error("Failed to save program:", err);

      // Handle field-specific validation errors from backend
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errors = {};
        const generalErrors = [];

        err.response.data.errors.forEach(error => {
          const errorLower = error.toLowerCase();

          // Map specific error types to form fields
          if (errorLower.includes("duplicate") && errorLower.includes("program code")) {
            errors.code = "A program with this code already exists. Please use a different code.";
          } else if (errorLower.includes("unique") && errorLower.includes("program code")) {
            errors.code = "This program code is already taken. Please choose a different code.";
          } else if (errorLower.includes("program code")) {
            errors.code = error;
          } else if (errorLower.includes("program name")) {
            errors.name = error;
          } else if (errorLower.includes("college")) {
            errors.college = error;
          } else {
            // General error that doesn't map to a specific field
            generalErrors.push(error);
          }
        });

        if (Object.keys(errors).length > 0) {
          setFieldErrors(errors);
        }

        if (generalErrors.length > 0) {
          const generalErrorMsg = generalErrors.length === 1
            ? generalErrors[0]
            : generalErrors.join(", ");
          setErrorMessage(generalErrorMsg);
        }
      }
      // Handle single error format
      else if (err.response?.data?.error) {
        const errorLower = err.response.data.error.toLowerCase();

        if (errorLower.includes("duplicate") && errorLower.includes("program code")) {
          setFieldErrors({ code: "A program with this code already exists. Please use a different code." });
        } else if (errorLower.includes("unique") && errorLower.includes("program code")) {
          setFieldErrors({ code: "This program code is already taken. Please choose a different code." });
        } else {
          setErrorMessage(err.response.data.error);
        }
      }
      // Handle generic errors
      else {
        const genericError = "Failed to save program. Please check your input and try again.";
        setErrorMessage(genericError);
      }
    }
  };

  // Check if this is an orphaned program (college was deleted)
  const isOrphaned = isEdit && program && !program.college;

  return (
    <form onSubmit={handleSubmit} className="modal-form">
      {errorMessage && (
        <div className="modal-error" role="alert">
          {errorMessage}
        </div>
      )}

      {isOrphaned && (
        <div className="modal-warning" role="alert" style={{
          backgroundColor: '#fff3cd',
          color: '#856404',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '16px',
          border: '1px solid #ffeaa7'
        }}>
          ⚠️ This program is currently not associated with any college.
          Please select a college to continue.
        </div>
      )}

      <div className="form-group">
        <label htmlFor="program-code" className="form-label">
          Program Code
        </label>
        <input
          id="program-code"
          name="code"
          className="form-control"
          placeholder="e.g., BSCS, BSIT, BSCPE"
          value={formData.code}
          onChange={handleChange}
          required
          aria-describedby={fieldErrors.code ? "code-error" : undefined}
        />
        {fieldErrors.code && (
          <span id="code-error" className="modal-field-error" role="alert">
            {fieldErrors.code}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="program-name" className="form-label">
          Program Name
        </label>
        <input
          id="program-name"
          name="name"
          className="form-control"
          placeholder="e.g., Bachelor of Science in Computer Science"
          value={formData.name}
          onChange={handleChange}
          required
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
        />
        {fieldErrors.name && (
          <span id="name-error" className="modal-field-error" role="alert">
            {fieldErrors.name}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="program-college" className="form-label">
          College
        </label>
        <div className="select-wrapper">
          <select
            id="program-college"
            name="college"
            className="form-control"
            value={formData.college}
            onChange={handleChange}
            required
            aria-describedby={fieldErrors.college ? "college-error" : undefined}
          >
            <option value="">Select a college</option>
            {colleges.map((college) => (
              <option key={college.code} value={college.code}>
                {college.name}
              </option>
            ))}
          </select>
        </div>
        {fieldErrors.college && (
          <span id="college-error" className="modal-field-error" role="alert">
            {fieldErrors.college}
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
          disabled={
            !formData.code?.trim() ||
            !formData.name?.trim() ||
            !formData.college?.trim()
          }
        >
          {isEdit ? "Update Program" : "Add Program"}
        </button>
      </div>
    </form>
  );
}

export default ProgramForm;
