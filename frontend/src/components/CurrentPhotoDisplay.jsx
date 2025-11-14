import React, { useState } from 'react';
import { FiCamera, FiTrash2, FiUser, FiLoader, FiAlertCircle } from 'react-icons/fi';
import PhotoMetadata from './PhotoMetadata';

const CurrentPhotoDisplay = ({ 
  student, 
  onChangePhoto, 
  onRemovePhoto,
  showMetadata = true,
  size = 150 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const hasPhoto = student?.profile_photo_url && !imageError;
  const studentName = `${student?.firstname || ''} ${student?.lastname || ''}`.trim();

  // Handle image load success
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  // Handle image load error
  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <div className="current-photo-display" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      padding: '20px',
      border: '2px dashed #e2e8f0',
      borderRadius: '12px',
      backgroundColor: '#f8fafc',
      transition: 'all 0.3s ease'
    }}>
      
      {/* Photo Thumbnail Container */}
      <div className="photo-thumbnail-container" style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        border: '3px solid #e2e8f0',
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        
        {/* Photo or Placeholder */}
        {hasPhoto ? (
          <img
            src={student.profile_photo_url}
            alt={`Profile photo of ${studentName || 'student'}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '50%',
              transition: 'opacity 0.3s ease',
              opacity: imageLoading ? 0 : 1
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a0aec0',
            textAlign: 'center',
            padding: '20px'
          }}>
            <FiUser size={48} style={{ marginBottom: '8px' }} />
            <span style={{ fontSize: '12px' }}>No Photo</span>
          </div>
        )}
        
        {/* Loading Overlay */}
        {imageLoading && hasPhoto && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%'
          }}>
            <FiLoader 
              className="spinning" 
              size={24} 
              style={{ color: '#4299e1' }}
            />
          </div>
        )}
        
        {/* Photo Status Indicator */}
        {hasPhoto && !imageLoading && (
          <div style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            width: '24px',
            height: '24px',
            backgroundColor: '#38a169',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #ffffff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <FiCamera size={12} style={{ color: '#ffffff' }} />
          </div>
        )}
      </div>
      
      {/* Photo Information */}
      <div style={{ textAlign: 'center' }}>
        <h4 style={{
          margin: '0 0 8px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: '#2d3748'
        }}>
          Current Profile Photo
        </h4>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: '#718096'
        }}>
          {studentName || 'Student'}
        </p>
        {hasPhoto && (
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '12px',
            color: '#a0aec0'
          }}>
            Click to view original
          </p>
        )}
      </div>
      
      {/* Photo Metadata */}
      {showMetadata && hasPhoto && (
        <PhotoMetadata student={student} />
      )}
      
      {/* Action Buttons */}
      <div className="photo-action-buttons" style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          type="button"
          onClick={onChangePhoto}
          className="btn btn-outline-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '500',
            borderRadius: '6px',
            border: '2px solid #4299e1',
            color: '#4299e1',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#4299e1';
            e.target.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = '#4299e1';
          }}
        >
          <FiCamera size={14} />
          {hasPhoto ? 'Change Photo' : 'Upload Photo'}
        </button>

        {hasPhoto && (
          <button
            type="button"
            onClick={onRemovePhoto}
            className="btn btn-outline-danger"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '500',
              borderRadius: '6px',
              border: '2px solid #e53e3e',
              color: '#e53e3e',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#e53e3e';
              e.target.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#e53e3e';
            }}
          >
            <FiTrash2 size={14} />
            Remove Photo
          </button>
        )}
      </div>
    </div>
  );
};

export default CurrentPhotoDisplay;
