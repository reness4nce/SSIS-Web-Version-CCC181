import React from 'react';
import { FiFileText, FiClock, FiHardDrive, FiLink } from 'react-icons/fi';

const PhotoMetadata = ({ student }) => {
  if (!student?.profile_photo_filename) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  const getDisplayFilename = (filename) => {
    if (!filename) return 'Unknown';
    const withoutId = filename.split('_').slice(1).join('_');
    return withoutId || filename;
  };

  const metadataItems = [
    {
      icon: FiFileText,
      label: 'Filename',
      value: getDisplayFilename(student.profile_photo_filename)
    },
    {
      icon: FiClock,
      label: 'Uploaded',
      value: formatDate(student.profile_photo_updated_at)
    },
    {
      icon: FiHardDrive,
      label: 'Storage',
      value: 'Supabase Storage'
    },
    {
      icon: FiLink,
      label: 'URL',
      value: (
        <a
          href={student.profile_photo_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#4299e1',
            textDecoration: 'none',
            fontSize: '12px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '200px',
            display: 'inline-block'
          }}
          title={student.profile_photo_url}
        >
          View Original
        </a>
      )
    }
  ];

  return (
    <div
      style={{
        marginTop: '12px',
        padding: '12px',
        backgroundColor: '#f8fafc',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        fontSize: '13px',
        color: '#4a5568'
      }}
    >
      {metadataItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: index === metadataItems.length - 1 ? 0 : '6px'
            }}
          >
            <Icon size={14} style={{ color: '#718096', flexShrink: 0 }} />
            <span style={{ fontWeight: '500' }}>{item.label}:</span>
            <span style={{ color: '#2d3748' }}>{item.value}</span>
          </div>
        );
      })}
    </div>
  );
};

export default PhotoMetadata;
