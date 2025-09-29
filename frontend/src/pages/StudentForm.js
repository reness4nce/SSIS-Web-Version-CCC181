import React, { useState, useEffect } from "react";
import api from "../services/api"; // ✅ our API wrapper

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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Submit (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.id && !isEdit) {
      setErrorMessage("Student ID is required when adding a new student.");
      return;
    }

    try {
      if (isEdit) {
        await api.updateStudent(formData.id, formData);
      } else {
        await api.createStudent(formData);
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Failed to save student:", err);
      setErrorMessage("Failed to save student. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label>ID</label>
        <input
          name="id"
          className="form-control"
          value={formData.id}
          onChange={handleChange}
          required
          disabled={isEdit}
        />
        {errorMessage && <div className="text-danger mt-2">{errorMessage}</div>}
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
      </div>
      <div className="mb-3">
        <label>Course</label>
        <select
          name="course"
          className="form-control"
          value={formData.course}
          onChange={handleChange}
          required
        >
          <option value="">Select a course</option>
          {programs.map((program) => (
            <option key={program.code} value={program.code}>
              {program.name}
            </option>
          ))}
        </select>
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
      </div>
      <div className="mb-3">
        <label>Gender</label>
        <select
          name="gender"
          className="form-control"
          value={formData.gender}
          onChange={handleChange}
          required
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
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
