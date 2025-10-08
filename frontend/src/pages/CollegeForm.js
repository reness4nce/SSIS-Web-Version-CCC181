import React, { useState, useEffect } from "react";
import api from "../services/api";
import { showSuccessToast, showErrorToast } from "../utils/alert";

function CollegeForm({ onSuccess, college, onClose }) {
  const operation = college ? 'update' : 'create';
  const isEdit = !!college;

  const [formData, setFormData] = useState({ code: "", name: "" });
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isEdit && college) {
      setFormData(college);
    } else {
      setFormData({ code: "", name: "" });
    }
  }, [college, isEdit]);

  const handleChange = (e) => {
    setErrorMessage("");
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.code || !formData.name) {
      showErrorToast("Code and Name are required.");
      return;
    }

    try {
      let response;
      if (isEdit) {
        // Use original college code in URL, updated data in body
        response = await api.updateCollege(college.code, formData);
        showSuccessToast("College updated successfully!");
      } else {
        response = await api.createCollege(formData);
        showSuccessToast("College created successfully!");
      }

      // Pass the updated/created college data and operation type to the callback for in-place updates
      if (onSuccess) {
        const collegeData = response.data.college;
        onSuccess(collegeData, operation);
      }
    } catch (err) {
      console.error("Failed to save college:", err);

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
        showErrorToast("Failed to save college. Please try again.");
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
        <label htmlFor="college-code" className="form-label">
          College Code
        </label>
        <input
          id="college-code"
          name="code"
          className="form-control"
          placeholder="e.g., CCS, CASS, CED"
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
        <label htmlFor="college-name" className="form-label">
          College Name
        </label>
        <input
          id="college-name"
          name="name"
          className="form-control"
          placeholder="e.g., College of Computer Studies"
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
          disabled={!formData.code.trim() || !formData.name.trim()}
        >
          {isEdit ? "Update College" : "Add College"}
        </button>
      </div>
    </form>
  );
}

export default CollegeForm;
