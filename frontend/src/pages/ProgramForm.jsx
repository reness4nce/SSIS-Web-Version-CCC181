import React, { useState, useEffect } from "react";
import api from "../services/api";
import { showSuccessToast, showErrorToast } from "../utils/alert";

function ProgramForm({ onSuccess, program, onClose }) {
  const operation = program ? 'update' : 'create';
  const isEdit = !!program;

  const [formData, setFormData] = useState({ code: "", name: "", college: "" });
  const [colleges, setColleges] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.code || !formData.name || !formData.college) {
      showErrorToast("All fields are required.");
      return;
    }

    try {
      let response;
      if (isEdit) {
        // Use original program code in URL, updated data in body
        response = await api.updateProgram(program.code, formData);
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

      // Handle validation errors (plural array format from backend)
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const validationErrors = err.response.data.errors;
        // Show the first validation error or join multiple errors
        const errorMessage = validationErrors.length === 1
          ? validationErrors[0]
          : validationErrors.join(", ");
        showErrorToast(errorMessage);
      }
      // Handle single error format (fallback)
      else if (err.response?.data?.error) {
        showErrorToast(err.response.data.error);
      }
      // Handle generic errors
      else {
        showErrorToast("Failed to save program. Please try again.");
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
          aria-describedby={errorMessage ? "code-error" : undefined}
        />
        {errorMessage && (
          <span id="code-error" className="modal-field-error" role="alert">
            {errorMessage}
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
          aria-describedby={errorMessage ? "name-error" : undefined}
        />
        {errorMessage && (
          <span id="name-error" className="modal-field-error" role="alert">
            {errorMessage}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="program-college" className="form-label">
          College
        </label>
        <select
          id="program-college"
          name="college"
          className="form-control"
          value={formData.college}
          onChange={handleChange}
          required
          aria-describedby={errorMessage ? "college-error" : undefined}
        >
          <option value="">Select a college</option>
          {colleges.map((college) => (
            <option key={college.code} value={college.code}>
              {college.name}
            </option>
          ))}
        </select>
        {errorMessage && (
          <span id="college-error" className="modal-field-error" role="alert">
            {errorMessage}
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
