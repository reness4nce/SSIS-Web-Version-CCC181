import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FiUsers, FiBookOpen, FiHome } from 'react-icons/fi';


const Dashboard = () => {
  const [stats, setStats] = useState({
    total_students: 0,
    total_programs: 0,
    total_colleges: 0
  });
  const [chartData, setChartData] = useState({
    students_by_program: [],
    students_by_college: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);


  useEffect(() => {
    fetchDashboardStats();
    fetchChartData();

    
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await api.getDashboardStats();
      setStats(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };


  const fetchChartData = async () => {
    try {
      const response = await api.getDashboardCharts();
      setChartData(response.data);
    } catch (err) {
      console.error('Error fetching chart data:', err);
    }
  };


  // Horizontal Bar Chart Component - Expanded Version
  const HorizontalBarChart = ({ data }) => {
    const maxCount = Math.max(...data.map(item => item.student_count));

    return (
      <div style={{
        height: '450px', // Increased from 320px
        overflow: 'auto',
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px', // Increased from 16px
          height: 'fit-content',
          minHeight: '100%'
        }}>
          {data.map((item, index) => {
            const width = maxCount > 0 ? (item.student_count / maxCount) * 100 : 0;

            return (
              <div key={item.program_code} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                {/* Horizontal Bar Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  height: '32px', // Increased from 28px
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {/* Program Name - Left Aligned */}
                  <div style={{
                    minWidth: '200px', // Increased from 160px
                    maxWidth: '200px',
                    flexShrink: 0,
                    boxSizing: 'border-box'
                  }}>
                    <div style={{
                      fontSize: '12px', // Increased from 11px
                      fontWeight: '500',
                      color: '#6B7280',
                      lineHeight: '1.3',
                      fontFamily: 'Inter, sans-serif',
                      overflow: 'visible',
                      wordWrap: 'break-word',
                      whiteSpace: 'normal',
                      maxHeight: '36px'
                    }}>
                      {item.program_name}
                    </div>
                  </div>

                  {/* Bar Container */}
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '100px',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{
                      flex: 1,
                      height: '24px', 
                      backgroundColor: '#F3F4F6',
                      borderRadius: '12px', 
                      overflow: 'hidden',
                      position: 'relative',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{
                        width: `${Math.max(width, 3)}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)`,
                        borderRadius: '12px',
                        transition: 'width 0.3s ease',
                        position: 'relative',
                        boxSizing: 'border-box'
                      }}>
                        {/* Value tooltip on hover */}
                        <div style={{
                          position: 'absolute',
                          top: '-26px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: '#374151',
                          color: 'white',
                          padding: '3px 6px',
                          borderRadius: '3px',
                          fontSize: '10px',
                          whiteSpace: 'nowrap',
                          opacity: 0,
                          transition: 'opacity 0.2s ease',
                          pointerEvents: 'none',
                          zIndex: 10
                        }}>
                          {item.student_count}
                        </div>
                      </div>
                    </div>

                    {/* Student Count - Right Aligned */}
                    <div style={{
                      minWidth: '35px', 
                      maxWidth: '45px',
                      textAlign: 'right',
                      flexShrink: 0,
                      boxSizing: 'border-box'
                    }}>
                      <div style={{
                        fontSize: '12px', 
                        fontWeight: '600',
                        color: '#111827',
                        fontFamily: 'Inter, sans-serif'
                      }}>
                        {item.student_count}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  // Pie Chart with Legend Component - Expanded Version
  const PieChartWithLegend = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.student_count, 0);
    let currentAngle = 0;

    // Larger radius for expanded view
    const radius = 110; // Increased from 85

    // Color coding based on college codes
    const collegeColors = {
      'COE': '#DC2626',     // RED
      'CCS': '#1E40AF',     // DARK BLUE
      'CASS': '#059669',    // GREEN
      'CHS': '#0284C7',     // LIGHT BLUE
      'CEBA': '#D97706',    // ORANGE
      'CSM': '#7C3AED'      // PURPLE
    };

    // Function to generate consistent random colors for unknown colleges
    const getRandomColor = (collegeCode) => {
      let hash = 0;
      for (let i = 0; i < collegeCode.length; i++) {
        const char = collegeCode.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }

      const hue = Math.abs(hash) % 360;
      const saturation = 65 + (Math.abs(hash) % 20);
      const lightness = 45 + (Math.abs(hash >> 8) % 15);

      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    };

    const colors = data.map(item => {
      const collegeCode = item.college_code || item.college_name?.substring(0, 4)?.toUpperCase() || 'DEFAULT';
      return collegeColors[collegeCode] || getRandomColor(collegeCode);
    });

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '450px', // Increased from 320px
        gap: '20px', // Increased from 16px
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'auto'
      }}>
        {/* Pie Chart */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '280px', // Increased from 260px
          width: '100%'
        }}>
          <div style={{
            width: '280px', // Increased from 220px
            height: '280px', // Increased from 220px
            position: 'relative',
            flexShrink: 0
          }}>
            <svg
              width="280" // Increased from 220
              height="280" // Increased from 220
              viewBox="0 0 280 280" // Increased from 0 0 220 220
              style={{
                overflow: 'visible',
                maxWidth: '100%'
              }}
            >
              {data.map((item, index) => {
                const percentage = total > 0 ? (item.student_count / total) * 100 : 0;
                const angle = (percentage / 100) * 360;
                const startAngle = currentAngle;
                const endAngle = currentAngle + angle;
                currentAngle += angle;

                const color = colors[index % colors.length];
                const startAngleRad = (startAngle * Math.PI) / 180;
                const endAngleRad = (endAngle * Math.PI) / 180;

                // Calculate midpoint angle for text positioning
                const midAngle = startAngle + (angle / 2);
                const midAngleRad = (midAngle * Math.PI) / 180;

                // Position text at 70% of radius from center
                const textRadius = radius * 0.7;
                const textX = 140 + textRadius * Math.cos(midAngleRad); // Adjusted from 110
                const textY = 140 + textRadius * Math.sin(midAngleRad); // Adjusted from 110

                const x1 = 140 + radius * Math.cos(startAngleRad); // Adjusted from 110
                const y1 = 140 + radius * Math.sin(startAngleRad); // Adjusted from 110
                const x2 = 140 + radius * Math.cos(endAngleRad); // Adjusted from 110
                const y2 = 140 + radius * Math.sin(endAngleRad); // Adjusted from 110

                const largeArcFlag = angle > 180 ? 1 : 0;

                const pathData = [
                  `M 140 140`, // Adjusted from M 110 110
                  `L ${x1} ${y1}`,
                  `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                  'Z'
                ].join(' ');

                return (
                  <g key={item.college_code}>
                    {/* Pie segment */}
                    <path
                      d={pathData}
                      fill={color}
                      stroke="#FFFFFF"
                      strokeWidth="3" // Increased from 2
                      style={{
                        cursor: 'pointer',
                        transition: 'opacity 0.2s ease',
                        maxWidth: '100%'
                      }}
                    />
                    {/* Percentage text on segment */}
                    {percentage > 3 && (
                      <text
                        x={textX}
                        y={textY}
                        fill="white"
                        fontSize={percentage > 10 ? "14" : "12"} // Increased from 12/10
                        fontWeight="600"
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          pointerEvents: 'none',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                        }}
                      >
                        {Math.round(percentage)}%
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Legend below chart */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px', // Increased from 6px
          padding: '0 16px',
          flex: 1,
          overflow: 'visible'
        }}>
          {data.map((item, index) => {
            const percentage = total > 0 ? Math.round((item.student_count / total) * 100) : 0;
            const color = colors[index % colors.length];

            return (
              <div key={item.college_code} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 0',
                borderRadius: '3px',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                {/* Square color indicator */}
                <div style={{
                  width: '10px',
                  height: '10px',
                  backgroundColor: color,
                  borderRadius: '2px',
                  flexShrink: 0
                }}></div>

                {/* College name and count */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minWidth: 0
                }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#374151',
                    fontFamily: 'Inter, sans-serif',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    minWidth: 0
                  }}>
                    {item.college_name} ({percentage}%)
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#111827',
                    fontFamily: 'Inter, sans-serif',
                    marginLeft: '8px',
                    flexShrink: 0
                  }}>
                    {item.student_count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="stat-card" style={{
      background: `linear-gradient(135deg, ${color}15, ${color}05)`,
      border: `1px solid ${color}20`,
      borderRadius: '12px',
      padding: isMobile ? '16px' : '20px',
      textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      transition: 'transform 0.2s ease',
    }}>
      <div style={{
        fontSize: isMobile ? '36px' : '40px',
        color: color,
        marginBottom: '8px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: isMobile ? '48px' : '52px'
      }}>
        {Icon}
      </div>
      <h2 style={{
        fontSize: isMobile ? '24px' : '28px',
        fontWeight: 'bold',
        margin: '6px 0',
        color: '#2d3748'
      }}>
        {loading ? '...' : value.toLocaleString()}
      </h2>
      <p style={{
        fontSize: isMobile ? '13px' : '14px',
        color: '#718096',
        margin: 0,
        fontWeight: '500'
      }}>
        {title}
      </p>
    </div>
  );


  if (error) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: '#e53e3e'
      }}>
        <p>{error}</p>
        <button
          onClick={fetchDashboardStats}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3182ce',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }


  return (
    <div style={{
      backgroundColor: '#F9FAFB',
      minHeight: '100vh'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: isMobile ? '12px' : '20px'
      }}>
        <div style={{
          marginBottom: isMobile ? '20px' : '24px'
        }}>
          <h1 style={{
            fontSize: isMobile ? '24px' : '28px',
            fontWeight: 'bold',
            color: '#2d3748',
            margin: '0 0 6px 0'
          }}>
            Dashboard
          </h1>
          <p style={{
            color: '#718096',
            fontSize: isMobile ? '14px' : '16px',
            margin: 0
          }}>
            Welcome to InsTrack - Student Information System Overview
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '32px',
          marginBottom: '40px'
        }}>
          <StatCard
            title="Total Students"
            value={stats.total_students}
            icon={<FiUsers />}
            color="#3182ce"
          />
          <StatCard
            title="Total Programs"
            value={stats.total_programs}
            icon={<FiBookOpen />}
            color="#38a169"
          />
          <StatCard
            title="Total Colleges"
            value={stats.total_colleges}
            icon={<FiHome />}
            color="#d69e2e"
          />
        </div>

        {/* Section Divider */}
        <div style={{
          height: '1px',
          backgroundColor: '#E5E7EB',
          margin: '20px 0 32px 0'
        }}></div>

        {/* Visual Data Section - Responsive Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(1, 1fr)' : 'repeat(12, 1fr)',
          gap: isMobile ? '20px' : '24px',
          marginBottom: isMobile ? '20px' : '24px',
          alignItems: 'start'
        }}>
          {/* Students by Program - Bar Chart */}
          <div style={{
            gridColumn: 'span 6',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: isMobile ? '16px' : '24px', 
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
            border: '1px solid #E5E7EB',
            minHeight: '520px', 
            height: 'fit-content',
            transition: 'box-shadow 0.3s ease, transform 0.3s ease',
            cursor: 'default',
            boxSizing: 'border-box',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.05)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <h3 style={{
              fontSize: isMobile ? '16px' : '18px', // Increased from 17px
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 20px 0', // Increased margin
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
              Students by Program
            </h3>
            {chartData.students_by_program.length > 0 ? (
              <HorizontalBarChart data={chartData.students_by_program} />
            ) : (
              <div style={{
                textAlign: 'center',
                color: '#9CA3AF',
                padding: isMobile ? '40px 20px' : '50px 20px'
              }}>
                <p style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: '500' }}>No program data available</p>
              </div>
            )}
          </div>

          {/* Students by College - Pie Chart */}
          <div style={{
            gridColumn: 'span 6',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: isMobile ? '16px' : '24px', 
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
            border: '1px solid #E5E7EB',
            minHeight: '520px', 
            height: 'fit-content',
            transition: 'box-shadow 0.3s ease, transform 0.3s ease',
            cursor: 'default',
            boxSizing: 'border-box',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.05)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <h3 style={{
              fontSize: isMobile ? '16px' : '18px', 
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 20px 0', 
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
              Students by College
            </h3>
            {chartData.students_by_college.length > 0 ? (
              <PieChartWithLegend data={chartData.students_by_college} />
            ) : (
              <div style={{
                textAlign: 'center',
                color: '#9CA3AF',
                padding: isMobile ? '40px 20px' : '50px 20px'
              }}>
                <p style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: '500' }}>No college data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


export default Dashboard;
