import React, { useState, useEffect, useRef } from "react";
import api from "../services/api"; // ✅ our API wrapper
import { showSuccessToast, showErrorToast } from "../utils/alert";
import { FiUpload, FiX, FiCamera, FiAlertCircle, FiCheckCircle, FiFile, FiTrash2 } from "react-icons/fi";
import StudentAvatar from "../components/StudentAvatar";
import CurrentPhotoDisplay from "../components/CurrentPhotoDisplay";
import ConfirmModal from "../components/ConfirmModal";

function StudentForm({ onSuccess, student, onClose }) {
  const operation = student ? 'update' : 'create';
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
  const [isValidatingProgram, setIsValidatingProgram] = useState(false);
  const [programValidation, setProgramValidation] = useState({});

  // Enhanced photo upload states with proper persistence
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [originalPhotoFilename, setOriginalPhotoFilename] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(student?.profile_photo_url || null);
  const [currentPhotoFilename, setCurrentPhotoFilename] = useState(student?.profile_photo_filename || null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showFileInput, setShowFileInput] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Retry mechanism states
  const [uploadRetries, setUploadRetries] = useState(0);
  const [maxRetries] = useState(3);

  // File input ref for explicit file selection
  const fileInputRef = useRef(null);

  // Confirmation modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // ✅ Sync current photo state with student prop changes (for page refresh persistence)
  useEffect(() => {
    if (student) {
      setCurrentPhotoUrl(student.profile_photo_url || null);
      setCurrentPhotoFilename(student.profile_photo_filename || null);
      setImageError(false);
      setImageLoading(true);
    }
  }, [student]);

  // ✅ Fetch available programs for the dropdown with refresh capability
  const fetchPrograms = async () => {
    try {
      const res = await api.getPrograms({ page: 1, per_page: 100 }); // Get all programs for dropdown
      setPrograms(res.data.items || []);
    } catch (err) {
      console.error("Failed to fetch programs:", err);
      setPrograms([]);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  // ✅ Refresh programs when form becomes visible (for updates from other components)
  useEffect(() => {
    if (onSuccess) {
      // This effect runs when the form is shown, ensuring fresh data
      fetchPrograms();
    }
  }, [onSuccess]);

  // ✅ Auto-refresh programs every 5 seconds to catch external changes
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log("🔄 Auto-refreshing programs list in StudentForm");
      fetchPrograms();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(intervalId);
  }, []);

  // ✅ Real-time program validation
  useEffect(() => {
    const shouldValidateProgram = formData.course && formData.course.trim();

    if (shouldValidateProgram) {
      setIsValidatingProgram(true);

      const timeoutId = setTimeout(async () => {
        try {
          const validation = await api.validateProgramCode(formData.course.trim());
          setProgramValidation(validation.data);

          // Update field error based on validation result
          if (!validation.data.valid) {
            setFieldErrors(prev => ({
              ...prev,
              course: validation.data.message || "Invalid program code"
            }));
          } else {
            // If valid, update form data to use the EXACT code from database
            if (validation.data.program && validation.data.program.code) {
              setFormData(prev => ({
                ...prev,
                course: validation.data.program.code // Use exact stored code
              }));
            }
            setFieldErrors(prev => ({ ...prev, course: null }));
          }
        } catch (err) {
          console.error("Program validation error:", err);
          setProgramValidation({});
          // Clear program error if validation fails (network issues, etc.)
          setFieldErrors(prev => ({ ...prev, course: null }));
        } finally {
          setIsValidatingProgram(false);
        }
      }, 500); // Wait 500ms after user stops typing

      return () => clearTimeout(timeoutId);
    } else {
      setIsValidatingProgram(false);
      setProgramValidation({});
      setFieldErrors(prev => ({ ...prev, course: null }));
    }
  }, [formData.course]);

  // ✅ Populate form if editing with data sanitization
  useEffect(() => {
    if (isEdit && student) {
      // Sanitize course data to ensure we only use the program code
      let sanitizedCourse = student.course || "";
      
      // If course contains parentheses, extract just the code part
      if (sanitizedCourse.includes('(') && sanitizedCourse.includes(')')) {
        // Extract code from parentheses (e.g., "Bachelor of Science in Computer Science (BSCS)" -> "BSCS")
        const match = sanitizedCourse.match(/\(([^)]+)\)$/);
        if (match && match[1]) {
          sanitizedCourse = match[1].trim();
        }
      }
      
      // If course is longer than expected (like full program name), try to extract code
      if (sanitizedCourse.length > 10) {
        console.warn(`⚠️ Unexpected course format: "${sanitizedCourse}", trying to extract code...`);
        // Try to find a typical program code pattern (letters followed by 2-3 numbers)
        const codeMatch = sanitizedCourse.match(/([A-Z]{2,4}[0-9]{2,4})/);
        if (codeMatch) {
          sanitizedCourse = codeMatch[1];
          console.log(`✅ Extracted code: ${sanitizedCourse}`);
        }
      }
      
      console.log(`🔍 Form data - Original course: "${student.course}", Sanitized: "${sanitizedCourse}"`);
      
      // Handle orphaned students (course/program was deleted)
      const safeStudent = {
        ...student,
        course: sanitizedCourse || "" // Use sanitized code for form
      };
      setFormData(safeStudent);
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

          // Check if ID exists - use uppercase for consistency
          const checkId = formData.id.toUpperCase();
          console.log(`🔍 Making API call for ID: ${checkId}`);

          // Check if ID exists
          await api.getStudent(checkId);

          // If we reach here, the ID exists (200 response)
          console.log(`✅ API returned 200 - ID exists in database`);

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
          console.log(`🔍 API call failed with status: ${err.response?.status}, error: ${err.message}`);

          // If we get a 404, the ID is available (this is what we expect for new IDs)
          if (err.response?.status === 404) {
            console.log(`✅ ID available (404 received) - this is expected for new IDs`);
            setFieldErrors(prev => ({ ...prev, id: null }));
          } else if (err.response?.status === 500) {
            console.log(`⚠️ Server error (500) - database issue?`);
            // For server errors, don't set an error - let form submission handle it
            setFieldErrors(prev => ({ ...prev, id: null }));
          } else if (err.response?.status === 400) {
            console.log(`⚠️ Bad request (400) - ID format issue?`);
            setFieldErrors(prev => ({
              ...prev,
              id: "Invalid ID format. Please check the format (YYYY-NNNN)."
            }));
          } else {
            // For other errors (network, timeout, etc.), clear any existing ID error
            // The form submission will handle these errors properly
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

  // Custom ID input handler with masking for XXXX-XXXX format
  const handleIdChange = (e) => {
    setErrorMessage("");
    setFieldErrors(prev => ({ ...prev, id: null }));

    let value = e.target.value;

    // Allow backspace/delete operations
    if (value.length < formData.id.length) {
      setFormData({ ...formData, id: value });
      return;
    }

    // Build result by allowing only valid characters in correct positions
    let result = '';
    for (let i = 0; i < value.length && result.length < 9; i++) {
      const char = value[i];
      if (char >= '0' && char <= '9') {
        result += char;
        // Auto-insert dash after exactly 4 digits (if not already present)
        if (result.replace('-', '').length === 4 && !result.includes('-')) {
          result += '-';
        }
      } else if (char === '-' && result.length === 4) {
        // Allow dash only in the correct position (after 4 digits)
        result += char;
      }
      // Ignore all other characters
    }

    setFormData({ ...formData, id: result });
  };

  // Enhanced photo validation with better error messages
  const validatePhotoFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const minSize = 1024; // 1KB minimum

    if (!file) {
      return 'No file selected';
    }

    if (!allowedTypes.includes(file.type)) {
      return 'Only JPEG, PNG, and WebP images are allowed';
    }
    
    if (file.size < minSize) {
      return 'File is too small. Please select an image at least 1KB in size.';
    }
    
    if (file.size > maxSize) {
      return 'File size must be less than 5MB';
    }
    
    return null;
  };

  // Client-side image compression function
  const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, file.type, quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Handle file selection
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Enhanced photo selection with proper state management
  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    const validationError = validatePhotoFile(file);
    if (validationError) {
      setPhotoError(validationError);
      return;
    }

    setPhotoError("");
    setIsCompressing(true);
    setShowFileInput(false);

    try {
      // Store original filename for later use
      setOriginalPhotoFilename(file.name);

      // Compress image if it's larger than 500KB
      let processedFile = file;
      if (file.size > 500 * 1024) {
        console.log('Compressing large image...');
        processedFile = await compressImage(file);
        console.log(`Original size: ${file.size}, Compressed size: ${processedFile.size}`);
      }

      setSelectedPhoto(processedFile);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(processedFile);
    } catch (error) {
      console.error('Error processing image:', error);
      setPhotoError('Failed to process image. Please try a different file.');
    } finally {
      setIsCompressing(false);
    }
  };

  // Enhanced photo upload with immediate persistence
  const handlePhotoUpload = async () => {
    if (!selectedPhoto || !formData.id) {
      setPhotoError("Please provide a student ID first");
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoError("");
    setUploadProgress(0);
    setUploadRetries(0);

    const attemptUpload = async (attempt = 0) => {
      try {
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        const response = await api.uploadStudentPhoto(formData.id, selectedPhoto, originalPhotoFilename);
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // Update current photo state immediately for page refresh persistence
        const newPhotoUrl = response.data.photo_url;
        const newPhotoFilename = response.data.filename;
        
        setCurrentPhotoUrl(newPhotoUrl);
        setCurrentPhotoFilename(newPhotoFilename);
        
        // Update student data to reflect new photo for immediate UI update
        const updatedStudentData = {
          ...student,
          profile_photo_url: newPhotoUrl,
          profile_photo_filename: newPhotoFilename
        };
        
        // Clear the upload state
        setSelectedPhoto(null);
        setPhotoPreview(null);
        setUploadProgress(0);

        // Show success message
        showSuccessToast('Photo uploaded successfully!');

        // Update the student data for immediate UI update
      if (onSuccess) {
        onSuccess(updatedStudentData, 'photo_remove_no_close');
      }

        console.log('✅ Photo uploaded and state updated for persistence');
        
      } catch (err) {
        console.error(`Photo upload attempt ${attempt + 1} failed:`, err);
        
        if (attempt < maxRetries - 1) {
          // Retry with exponential backoff
          setUploadRetries(attempt + 1);
          setTimeout(() => {
            attemptUpload(attempt + 1);
          }, Math.pow(2, attempt) * 1000); // 1s, 2s, 4s delay
        } else {
          // Final attempt failed
          const errorMessage = err.response?.data?.error || 'Failed to upload photo after multiple attempts';
          setPhotoError(errorMessage);
          showErrorToast(errorMessage);
        }
      } finally {
        if (attempt === 0 || attempt === maxRetries - 1) {
          setIsUploadingPhoto(false);
          setUploadProgress(0);
          setUploadRetries(0);
        }
      }
    };

    await attemptUpload();
  };

  // Enhanced photo removal with confirmation
  const handleRemovePhoto = () => {
    if (!isEdit || !currentPhotoFilename) return;
    setIsConfirmModalOpen(true);
  };

  // Handle confirmed photo removal
  const handleConfirmPhotoRemoval = async () => {
    try {
      await api.deleteStudentPhoto(student.id);

      // Clear current photo state immediately for page refresh persistence
      setCurrentPhotoUrl(null);
      setCurrentPhotoFilename(null);
      setImageError(false);

      // Show success message
      showSuccessToast('Photo removed successfully!');

      // Update student data to reflect removed photo
      const updatedStudentData = {
        ...student,
        profile_photo_url: null,
        profile_photo_filename: null
      };

      if (onSuccess) {
        onSuccess(updatedStudentData, 'photo_update_no_close');
      }

      console.log('✅ Photo removed and state updated for persistence');
    } catch (err) {
      console.error('Photo removal error:', err);
      showErrorToast('Failed to remove photo');
    } finally {
      setIsConfirmModalOpen(false);
    }
  };

  // Handle modal cancel
  const handleCancelPhotoRemoval = () => {
    setIsConfirmModalOpen(false);
  };

  // Enhanced photo change handler
  const handleChangePhoto = () => {
    setShowFileInput(true);
    setPhotoError("");
    setSelectedPhoto(null);
    setPhotoPreview(null);
  };

  // Clear photo selection
  const clearPhotoSelection = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setPhotoError("");
    setUploadProgress(0);
    setUploadRetries(0);
    setShowFileInput(false);
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get current workflow step
  const getCurrentStep = () => {
    if (isCompressing) return 1;
    if (photoPreview) return 2;
    if (selectedPhoto) return 2;
    return 0;
  };

  const currentStep = getCurrentStep();

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
    } else if (isEdit && student && formData.id !== student.id && fieldErrors.id) {
      // For editing: if ID is different from original AND real-time validation found an issue
      // Only show this error if real-time validation actually detected a problem
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
      console.log(`❌ Form submission blocked: ID validation error exists for ${formData.id}`);
      showErrorToast("Please fix the Student ID error before submitting.");
      return;
    } else if (isEdit && student && formData.id !== student.id) {
      console.log(`✅ Form submission allowed: No ID validation errors for ${formData.id}`);
    }

    try {
      let response;
      if (isEdit) {
        // Use original student ID in URL, updated data in body
        // Include photo if selected during editing
        response = await api.updateStudent(student.id, formData, selectedPhoto, originalPhotoFilename);
      } else {
        // NEW: For creating students, include photo if available
        response = await api.createStudent(formData, selectedPhoto, originalPhotoFilename);
      }

      // Pass the updated/created student data and operation type to the callback for in-place updates
      if (onSuccess) {
        const studentData = response.data.student;
        onSuccess(studentData, operation, selectedPhoto ? true : false);

        // Clear photo state after successful creation (only for new students)
        if (!isEdit) {
          setSelectedPhoto(null);
          setPhotoPreview(null);
          setOriginalPhotoFilename(null);
          setPhotoError("");
          setUploadProgress(0);
          setShowFileInput(false);
          // Clear file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      }
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

  // Check if this is an orphaned student (course/program was deleted)
  const isOrphaned = isEdit && student && !student.course;

  // Create enhanced student object for CurrentPhotoDisplay
  const enhancedStudent = {
    ...student,
    profile_photo_url: currentPhotoUrl,
    profile_photo_filename: currentPhotoFilename,
    profile_photo_updated_at: student?.profile_photo_updated_at
  };

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
          ⚠️ This student is currently not enrolled in any program.
          Please select a program to continue.
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
            onChange={handleIdChange}
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
        <div className="select-wrapper">
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
        </div>
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
        <div className="select-wrapper">
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
            <option value="Other">Other</option>
          </select>
        </div>
        {fieldErrors.gender && (
          <span id="gender-error" className="modal-field-error" role="alert">
            {fieldErrors.gender}
          </span>
        )}
      </div>

      {/* Enhanced Photo Upload Section with CurrentPhotoDisplay */}
      <div className="form-group">
        <label className="form-label">
          Profile Photo
          <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: '8px' }}>
            (Optional - JPEG, PNG, WebP up to 5MB)
          </span>
        </label>
        
        {/* Current Photo Display for Edit Mode */}
        {isEdit && (currentPhotoUrl || !showFileInput) && !selectedPhoto && (
          <div style={{ marginBottom: '20px' }}>
            <CurrentPhotoDisplay
              student={enhancedStudent}
              onChangePhoto={handleChangePhoto}
              onRemovePhoto={handleRemovePhoto}
              showMetadata={true}
              size={150}
            />
          </div>
        )}

        {/* Photo Upload Interface */}
        {(showFileInput || selectedPhoto || !isEdit) && (
          <>
            {/* Workflow Steps Indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: currentStep >= 0 ? '#4299e1' : '#e2e8f0',
                  color: currentStep >= 0 ? '#ffffff' : '#a0aec0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {currentStep > 0 ? <FiCheckCircle size={14} /> : '1'}
                </div>
                <span style={{ fontSize: '14px', color: currentStep >= 0 ? '#2d3748' : '#a0aec0' }}>
                  Choose File
                </span>
              </div>
              
              <div style={{ 
                width: '40px', 
                height: '2px', 
                backgroundColor: currentStep >= 1 ? '#4299e1' : '#e2e8f0' 
              }}></div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: currentStep >= 1 ? '#4299e1' : '#e2e8f0',
                  color: currentStep >= 1 ? '#ffffff' : '#a0aec0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {currentStep > 1 ? <FiCheckCircle size={14} /> : '2'}
                </div>
                <span style={{ fontSize: '14px', color: currentStep >= 1 ? '#2d3748' : '#a0aec0' }}>
                  Preview & Upload
                </span>
              </div>
            </div>

            {/* Enhanced Photo Upload Interface */}
            <div style={{
              border: '2px dashed #cbd5e0',
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              backgroundColor: '#f7fafc',
              transition: 'all 0.2s ease',
              borderColor: photoError ? '#f56565' : currentStep >= 0 ? '#4299e1' : '#cbd5e0'
            }}>
              
              {/* Step 1: File Selection */}
              {currentStep === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <FiCamera size={48} color="#4299e1" />
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#2d3748' }}>
                      Choose a Profile Photo
                    </h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#718096' }}>
                      Select an image file from your device
                    </p>
                    <button
                      type="button"
                      onClick={handleFileSelect}
                      className="btn btn-primary"
                      style={{ 
                        padding: '12px 24px', 
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        margin: '0 auto'
                      }}
                      aria-label="Choose file from device"
                    >
                      <FiFile size={16} />
                      Choose File
                    </button>
                    <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#a0aec0' }}>
                      JPEG, PNG, WebP • Max 5MB • Auto-compression enabled
                    </p>
                  </div>
                </div>
              )}

              {/* Step 1.5: Processing */}
              {isCompressing && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #e2e8f0',
                    borderTop: '4px solid #4299e1',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <p style={{ margin: 0, fontSize: '16px', color: '#4299e1', fontWeight: '500' }}>
                    Processing image...
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#718096' }}>
                    Optimizing for faster upload
                  </p>
                </div>
              )}

              {/* Step 2: Preview and Upload */}
              {photoPreview && !isCompressing && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      style={{
                        width: '120px',
                        height: '120px',
                        objectFit: 'cover',
                        borderRadius: '50%',
                        border: '3px solid #4299e1'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      width: '24px',
                      height: '24px',
                      backgroundColor: '#38a169',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FiCheckCircle size={14} color="white" />
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#2d3748' }}>
                      Ready to Upload
                    </h4>
                    <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#718096' }}>
                      Click "Upload to Server" to save this photo
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {/* Show message for editing students that photo will be uploaded with form */}
                    {isEdit && selectedPhoto && (
                      <div style={{
                        padding: '12px 24px',
                        backgroundColor: '#e6fffa',
                        border: '1px solid #b2f5ea',
                        borderRadius: '6px',
                        color: '#234e52',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        Photo will be uploaded when you update the student
                      </div>
                    )}

                    {/* Show message for new students that photo will be uploaded with form */}
                    {!isEdit && selectedPhoto && (
                      <div style={{
                        padding: '12px 24px',
                        backgroundColor: '#e6fffa',
                        border: '1px solid #b2f5ea',
                        borderRadius: '6px',
                        color: '#234e52',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        Photo will be uploaded when you create the student
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleFileSelect}
                      disabled={isUploadingPhoto}
                      className="btn btn-secondary"
                      style={{
                        padding: '12px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      aria-label="Choose different file"
                    >
                      <FiFile size={16} />
                      Choose Different File
                    </button>

                    <button
                      type="button"
                      onClick={clearPhotoSelection}
                      disabled={isUploadingPhoto}
                      className="btn btn-outline-secondary"
                      style={{
                        padding: '12px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      aria-label="Clear selection"
                    >
                      <FiX size={16} />
                      Clear
                    </button>
                  </div>
                  
                  {uploadRetries > 0 && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      fontSize: '12px', 
                      color: '#f56565',
                      backgroundColor: '#fff5f5',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid #fed7d7'
                    }}>
                      <FiAlertCircle size={14} />
                      Retry attempt {uploadRetries} of {maxRetries}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
              disabled={isUploadingPhoto || isCompressing}
              aria-label="Select profile photo file"
            />

            {/* Enhanced Photo Upload Error */}
            {photoError && (
              <div className="modal-field-error" role="alert" style={{ 
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#fff5f5',
                border: '1px solid #fed7d7',
                borderRadius: '6px',
                color: '#c53030',
                fontSize: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiAlertCircle size={16} />
                  <span>{photoError}</span>
                </div>
              </div>
            )}

            {/* Enhanced Upload Progress */}
            {isUploadingPhoto && (
              <div style={{ 
                marginTop: '16px', 
                padding: '16px', 
                backgroundColor: '#e6fffa', 
                borderRadius: '8px',
                border: '1px solid #81e6d9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #4fd1c7',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <div>
                    <span style={{ fontSize: '14px', color: '#285e61', fontWeight: '500' }}>
                      Uploading photo to server...
                    </span>
                    {uploadRetries > 0 && (
                      <div style={{ fontSize: '12px', color: '#d97706', marginTop: '2px' }}>
                        Retry attempt {uploadRetries} of {maxRetries}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#c6f6d5',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    width: `${uploadProgress}%`,
                    height: '100%',
                    backgroundColor: '#38a169',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
                
                <div style={{ 
                  fontSize: '12px', 
                  color: '#38a169',
                  textAlign: 'center',
                  fontWeight: '500'
                }}>
                  {uploadProgress}% complete
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="modal-footer">
        <button
          type="button"
          className="modal-btn modal-btn-secondary"
          onClick={onClose}
          disabled={isUploadingPhoto}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="modal-btn modal-btn-primary"
          disabled={!formData.id?.trim() || !formData.firstname?.trim() || !formData.lastname?.trim() ||
                   !formData.year || !formData.gender || isUploadingPhoto}
        >
          {isEdit ? "Update Student" : "Add Student"}
        </button>
      </div>

      {/* Photo Removal Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={handleCancelPhotoRemoval}
        onConfirm={handleConfirmPhotoRemoval}
        title="Remove Profile Photo"
        message="Are you sure you want to remove this photo? This action cannot be undone."
        confirmText="Yes, Remove Photo"
        cancelText="Cancel"
        confirmButtonClass="danger"
        size="small"
      />
    </form>
  );
}

export default StudentForm;
