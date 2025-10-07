import React, { useState, useEffect } from "react";
import api from "../services/api";
import { showSuccessToast, showErrorToast } from "../utils/alert";

function CollegeForm({ onSuccess, college }) {
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
      if (isEdit) {
        await api.updateCollege(formData.code, formData);
        showSuccessToast("College updated successfully!");
      } else {
        await api.createCollege(formData);
        showSuccessToast("College created successfully!");
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Failed to save college:", err);
      const errorMessage = err.response?.data?.error || "Failed to save college. Please try again.";
      showErrorToast(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label>Code</label>
        <input
          name="code"
          className="form-control"
          value={formData.code}
          onChange={handleChange}
          required
        />
      </div>
      <div className="mb-3">
        <label>Name</label>
        <input
          name="name"
          className="form-control"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>
      {errorMessage && <div className="text-danger mt-2">{errorMessage}</div>}
      <div className="modal-footer">
        <button className="btn btn-primary" type="submit">
          {isEdit ? "Update" : "Add"}
        </button>
      </div>
    </form>
  );
}

export default CollegeForm;
