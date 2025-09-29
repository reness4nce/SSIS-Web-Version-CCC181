// src/services/api.js
import axios from "axios";

// This apiClient is for your main API endpoints (/colleges, /students, etc.)
const apiClient = axios.create({
  baseURL: "http://localhost:5000/api", // Correct for your /api/* routes
  withCredentials: true, // This is CRUCIAL for sending session cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// This apiClient is specifically for the /auth routes, which have a different path
const authApiClient = axios.create({
  baseURL: "http://localhost:5000", // Base URL without the /api prefix
  withCredentials: true, // Also crucial here
  headers: {
    "Content-Type": "application/json",
  },
});


const api = {
  // -------- Authentication --------
  /**
   * Sends login credentials to the backend.
   * @param {string} username The user's username.
   * @param {string} password The user's password.
   * @returns {Promise<object>} The user data from the backend.
   */
  login(username, password) {
    // Uses the authApiClient to hit http://localhost:5000/auth/login
    return authApiClient.post("/auth/login", { username, password });
  },

  /**
   * Sends a logout request to the backend.
   */
  logout() {
    return authApiClient.post("/auth/logout");
  },

  /**
   * Checks with the backend to see if the user is currently authenticated.
   * @returns {Promise<object>} An object with isAuthenticated and user data.
   */
  checkAuthStatus() {
    return authApiClient.get("/auth/status");
  },


  // -------- Your Existing API Functions (Unchanged) --------
  
  // Colleges
  getColleges(params = {}) { return apiClient.get("/colleges", { params }); },
  getCollege(code) { return apiClient.get(`/colleges/${code}`); },
  createCollege(data) { return apiClient.post("/colleges", data); },
  updateCollege(code, data) { return apiClient.put(`/colleges/${code}`, data); },
  deleteCollege(code) { return apiClient.delete(`/colleges/${code}`); },

  // Programs
  getPrograms(params = {}) { return apiClient.get("/programs", { params }); },
  getProgram(code) { return apiClient.get(`/programs/${code}`); },
  createProgram(data) { return apiClient.post("/programs", data); },
  updateProgram(code, data) { return apiClient.put(`/programs/${code}`, data); },
  deleteProgram(code) { return apiClient.delete(`/programs/${code}`); },

  // Students
  getStudents(params = {}) { return apiClient.get("/students", { params }); },
  getStudent(id) { return apiClient.get(`/students/${id}`); },
  createStudent(data) { return apiClient.post("/students", data); },
  updateStudent(id, data) { return apiClient.put(`/students/${id}`, data); },
  deleteStudent(id) { return apiClient.delete(`/students/${id}`); },
};

export default api;
