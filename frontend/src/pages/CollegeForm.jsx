import React, { useState, useEffect } from "react";
import api from "../services/api";
import { showSuccessToast, showErrorToast } from "../utils/alert";

function CollegeForm({ onSuccess, college, onClose }) {
  const operation = college ? 'update' : 'create';
  const isEdit = !!college;

  const [formData, setFormData] = useState({ code: "", name: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (isEdit && college) {
      setFormData(college);
    } else {
      setFormData({ code: "", name: "" });
    }
  }, [college, isEdit]);

  const handleChange = (e) => {
    setErrorMessage("");
    setFieldErrors(prev => ({ ...prev, [e.target.name]: null }));
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
      const errors = {};

      
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const validationErrors = err.response.data.errors;

        validationErrors.forEach(error => {
          const errorLower = error.toLowerCase();

          
          if (errorLower.includes("college code already exists")) {
            errors.code = error;
          } else {
           
            setErrorMessage(error);
            showErrorToast(error);
          }
        });

        
        setFieldErrors(errors);
      }
      
      else if (err.response?.data?.error) {
        const errorLower = err.response.data.error.toLowerCase();

        
        if (errorLower.includes("college code already exists")) {
          setFieldErrors({ code: err.response.data.error });
        } else {
          setErrorMessage(err.response.data.error);
          showErrorToast(err.response.data.error);
        }
      }
      // Handle generic errors
      else {
        const genericError = "Failed to save college. Please try again.";
        setErrorMessage(genericError);
        showErrorToast(genericError);
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
          aria-describedby={fieldErrors.code ? "code-error" : undefined}
        />
        {fieldErrors.code && (
          <span id="code-error" className="modal-field-error" role="alert">
            {fieldErrors.code}
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
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
        />
        {fieldErrors.name && (
          <span id="name-error" className="modal-field-error" role="alert">
            {fieldErrors.name}
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
