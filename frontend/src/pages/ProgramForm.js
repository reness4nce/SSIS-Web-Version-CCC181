import React, { useState, useEffect } from "react";
import api from "../services/api";
import { showSuccessToast, showErrorToast } from "../utils/alert";

function ProgramForm({ onSuccess, program }) {
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
      setFormData(program);
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
      if (isEdit) {
        await api.updateProgram(formData.code, formData);
        showSuccessToast("Program updated successfully!");
      } else {
        await api.createProgram(formData);
        showSuccessToast("Program created successfully!");
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Failed to save program:", err);
      const errorMessage = err.response?.data?.error || "Failed to save program. Please try again.";
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
      <div className="mb-3">
        <label>College</label>
        <select
          name="college"
          className="form-control"
          value={formData.college}
          onChange={handleChange}
          required
        >
          <option value="">Select a college</option>
          {colleges.map((college) => (
            <option key={college.code} value={college.code}>
              {college.name}
            </option>
          ))}
        </select>
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

export default ProgramForm;
