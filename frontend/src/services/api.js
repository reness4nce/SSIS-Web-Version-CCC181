// src/services/api.jsx
import axios from "axios";

// This apiClient is for your main API endpoints (/colleges, /students, etc.)
const apiClient = axios.create({
  baseURL: "http://localhost:5000/api", // Updated to match backend API routes
  withCredentials: true, // This is CRUCIAL for sending session cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url, config.data);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// This apiClient is specifically for the /auth routes, which have a different path
const authApiClient = axios.create({
  baseURL: "http://localhost:5000/api", // Base URL with /api prefix for consistency
  withCredentials: true, // Also crucial here
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for auth debugging
authApiClient.interceptors.request.use(
  (config) => {
    console.log('Auth API Request:', config.method?.toUpperCase(), config.url, config.data);
    return config;
  },
  (error) => {
    console.error('Auth API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for auth debugging
authApiClient.interceptors.response.use(
  (response) => {
    console.log('Auth API Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('Auth API Response Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);


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

  /**
   * Gets dashboard statistics.
   * @param {object} options - Request options including signal for AbortController
   * @returns {Promise<object>} Dashboard statistics including totals for students, programs, and colleges.
   */
  getDashboardStats(options = {}) {
    return authApiClient.get("/auth/dashboard", options);
  },

  /**
   * Gets dashboard chart data.
   * @param {object} options - Request options including signal for AbortController
   * @returns {Promise<object>} Chart data for students by program and college visualizations.
   */
  getDashboardCharts(options = {}) {
    return authApiClient.get("/auth/dashboard/charts", options);
  },

  /**
   * Sends signup data to the backend.
   * @param {string} username The user's desired username.
   * @param {string} email The user's email address.
   * @param {string} password The user's password.
   * @param {string} confirmPassword The user's password confirmation.
   * @returns {Promise<object>} The response from the backend.
   */
  signup(username, email, password, confirmPassword) {
    return authApiClient.post("/auth/signup", {
      username,
      email,
      password,
      confirm_password: confirmPassword
    });
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
  getStudent(id) {
    console.log(`🔍 API: Checking student existence for ID: ${id}`);
    return apiClient.get(`/students/${id}`);
  },
  createStudent(data, photoFile = null, originalFilename = null) {
    if (photoFile) {
      // Create FormData for student creation with photo
      const formData = new FormData();

      // Add student data to FormData
      Object.keys(data).forEach(key => {
        formData.append(key, data[key]);
      });

      // Handle compressed images (Blob) - convert to File with proper filename
      let fileToUpload = photoFile;
      if (photoFile instanceof Blob && !(photoFile instanceof File)) {
        // If it's a compressed Blob, we need a filename
        const filename = originalFilename || `photo_${Date.now()}.jpg`;
        // Create a File object from the Blob
        fileToUpload = new File([photoFile], filename, { type: photoFile.type || 'image/jpeg' });
      }

      // Add photo file to FormData
      formData.append('photo', fileToUpload);

      return apiClient.post("/students", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } else {
      // Standard JSON request for student creation without photo
      return apiClient.post("/students", data);
    }
  },
  updateStudent(id, data, photoFile = null, originalFilename = null) {
    if (photoFile) {
      // Create FormData for student update with photo
      const formData = new FormData();

      // Add student data to FormData
      Object.keys(data).forEach(key => {
        formData.append(key, data[key]);
      });

      // Handle compressed images (Blob) - convert to File with proper filename
      let fileToUpload = photoFile;
      if (photoFile instanceof Blob && !(photoFile instanceof File)) {
        // If it's a compressed Blob, we need a filename
        const filename = originalFilename || `photo_${Date.now()}.jpg`;
        // Create a File object from the Blob
        fileToUpload = new File([photoFile], filename, { type: photoFile.type || 'image/jpeg' });
      }

      // Add photo file to FormData
      formData.append('photo', fileToUpload);

      return apiClient.put(`/students/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } else {
      // Standard JSON request for student update without photo
      return apiClient.put(`/students/${id}`, data);
    }
  },
  deleteStudent(id) { return apiClient.delete(`/students/${id}`); },
  validateProgramCode(code) { return apiClient.get(`/students/validate-program/${code}`); },

  // Student Photo Upload
  uploadStudentPhoto(studentId, file, originalFilename = null) {
    const formData = new FormData();

    // Handle compressed images (Blob) - convert to File with proper filename
    let fileToUpload = file;
    if (file instanceof Blob && !(file instanceof File)) {
      // If it's a compressed Blob, we need a filename
      const filename = originalFilename || `photo_${Date.now()}.jpg`;
      // Create a File object from the Blob
      fileToUpload = new File([file], filename, { type: file.type || 'image/jpeg' });
    }

    formData.append('photo', fileToUpload);
    return apiClient.post(`/students/${studentId}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteStudentPhoto(studentId) {
    return apiClient.delete(`/students/${studentId}/photo`);
  },
};

export default api;
