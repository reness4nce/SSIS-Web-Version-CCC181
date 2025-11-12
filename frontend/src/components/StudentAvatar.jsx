import React, { useState, useEffect, useMemo } from 'react';

// Constants
const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD',
  '#00D2D3', '#FF9F43', '#6C5CE7', '#A29BFE'
];

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

  // Validate image URL
  const isValidImageUrl = useMemo(() => {
    if (!student?.profile_photo_url || typeof student.profile_photo_url !== 'string') {
      return false;
    }

    try {
      const url = new URL(student.profile_photo_url);
      const hasImagePath =
        /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url.pathname) ||
        url.pathname.includes('student-photos');
      return hasImagePath && url.protocol === 'https:';
    } catch {
      return false;
    }
  }, [student?.profile_photo_url]);

  // Reset states when URL changes
  useEffect(() => {
    setImageError(false);
    setImageLoading(!!student?.profile_photo_url && isValidImageUrl);
  }, [student?.profile_photo_url, isValidImageUrl]);

  // Generate initials
  const initials = useMemo(() => {
    const first = student?.firstname?.charAt(0).toUpperCase() || '';
    const last = student?.lastname?.charAt(0).toUpperCase() || '';
    return first + last || '?';
  }, [student?.firstname, student?.lastname]);

  // Generate consistent color based on student ID
  const avatarColor = useMemo(() => {
    if (!student?.id) return '#A0AEC0';

    let hash = 0;
    for (let i = 0; i < student.id.length; i++) {
      hash = student.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }, [student?.id]);

  const showImage = student?.profile_photo_url && !imageError && isValidImageUrl;
  const studentName = `${student?.firstname || ''} ${student?.lastname || ''}`.trim();

  // Base styles
  const containerStyles = {
    width: size,
    height: size,
    borderRadius: size / 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.max(size * 0.35, 12),
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: showImage ? 'transparent' : avatarColor,
    border: showBorder ? `${borderWidth}px solid ${borderColor}` : 'none',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    flexShrink: 0,
    userSelect: 'none'
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <div
      style={containerStyles}
      role="img"
      aria-label={studentName ? `Photo of ${studentName}` : 'Student photo'}
      title={`${studentName || 'Unknown Student'} (${student?.id || 'N/A'})`}
    >
      {showImage ? (
        <img
          src={student.profile_photo_url}
          alt={studentName || 'Student'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: size / 2
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        <span
          style={{
            textShadow: '0 1px 2px rgba(0,0,0,0.1)',
            lineHeight: 1
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
};

export default StudentAvatar;
