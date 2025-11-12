import React, { useState } from 'react';

const StudentAvatar = ({ 
  student, 
  size = 36, 
  showBorder = true,
  borderColor = '#CBD5E0',
  borderWidth = 2,
  backgroundColor = '#F7FAFC',
  textColor = '#2D3748'
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Calculate dimensions
  const dimensions = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  // Create initials from student name
  const getInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return '?';
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || '?';
  };

  // Generate a color based on student ID for consistent styling
  const getAvatarColor = (studentId) => {
    if (!studentId) return '#A0AEC0';
    
    let hash = 0;
    for (let i = 0; i < studentId.length; i++) {
      hash = studentId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD',
      '#00D2D3', '#FF9F43', '#6C5CE7', '#A29BFE'
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  const avatarColor = getAvatarColor(student?.id);
  const initials = getInitials(student?.firstname, student?.lastname);

  // Container styles
  const containerStyles = {
    ...dimensions,
    borderRadius: dimensions.borderRadius,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.max(size * 0.4, 12), // Responsive font size
    fontWeight: '600',
    color: textColor,
    backgroundColor: imageError || !student?.profile_photo_url ? 
      (student?.profile_photo_url ? avatarColor : backgroundColor) : 
      'transparent',
    border: showBorder ? `${borderWidth}px solid ${borderColor}` : 'none',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.2s ease-in-out',
    cursor: 'default',
    userSelect: 'none',
    flexShrink: 0,
    backgroundImage: !imageError && student?.profile_photo_url ? 
      `url(${student.profile_photo_url})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  // Handle image load events
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  // Loading spinner for images
  if (student?.profile_photo_url && imageLoading && !imageError) {
    return (
      <div style={containerStyles}>
        <div 
          style={{
            width: '20%',
            height: '20%',
            border: `2px solid ${textColor}`,
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    );
  }

  // Main avatar content
  return (
    <div style={containerStyles}>
      {student?.profile_photo_url && !imageError ? (
        <img
          src={student.profile_photo_url}
          alt={`${student.firstname} ${student.lastname}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: dimensions.borderRadius,
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        <span 
          style={{
            fontSize: Math.max(size * 0.35, 10),
            fontWeight: '600',
            color: '#FFFFFF',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)',
            lineHeight: 1,
          }}
        >
          {initials}
        </span>
      )}
      
      {/* Optional hover overlay for accessibility */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'transparent',
          borderRadius: dimensions.borderRadius,
          transition: 'background-color 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(0,0,0,0.05)',
          },
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title={`${student?.firstname || ''} ${student?.lastname || ''} (${student?.id || 'N/A'})`}
      />
    </div>
  );
};

export default StudentAvatar;
