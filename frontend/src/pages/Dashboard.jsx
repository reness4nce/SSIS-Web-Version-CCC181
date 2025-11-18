import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiUsers, FiBookOpen, FiHome, FiRefreshCw } from 'react-icons/fi';

/* ------------ Data sanitizers ------------- */

const sanitizeProgramData = (data) => {
  if (!Array.isArray(data)) return [];

  return data
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => {
      const programCode =
        item.program_code || item.program_name || `program_${index}`;
      const programName =
        item.program_name || item.program_code || 'Unknown Program';

      return {
        program_code: programCode,
        program_name: programName,
        student_count:
          typeof item.student_count === 'number' ? item.student_count : 0,
      };
    })
    .filter((item) => item.student_count > 0)
    .sort((a, b) => b.student_count - a.student_count);
};

const sanitizeCollegeData = (data) => {
  if (!Array.isArray(data)) return [];

  return data
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => {
      const collegeCode =
        item.college_code || item.college_name || `college_${index}`;
      const collegeName =
        item.college_name || item.college_code || 'Unknown College';

      return {
        college_code: collegeCode,
        college_name: collegeName,
        student_count:
          typeof item.student_count === 'number' ? item.student_count : 0,
      };
    })
    .filter((item) => item.student_count > 0)
    .sort((a, b) => b.student_count - a.student_count);
};

/* ------------ useMediaQuery hook ----------- */

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(query).matches
      : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);

    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
};

/* ------------ useDashboardData hook -------- */

const useDashboardData = (autoRefreshMs = 300000) => {
  const [stats, setStats] = useState({
    total_students: 0,
    total_programs: 0,
    total_colleges: 0,
  });
  const [chartData, setChartData] = useState({
    students_by_program: [],
    students_by_college: [],
  });
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [chartsError, setChartsError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const abortControllerRef = useRef(null);

  // Client-side cache key and TTL (5 minutes)
  const CACHE_KEY = 'dashboard_cache_v1';
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  // Load data from cache (client-side)
  const loadFromCache = useCallback(() => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (!cachedData) return false;

      const parsed = JSON.parse(cachedData);
      const now = Date.now();

      // Check if cache is still valid
      if (now - parsed.timestamp > CACHE_TTL_MS) {
        localStorage.removeItem(CACHE_KEY);
        return false;
      }

      // Load cached data immediately
      setStats(parsed.data.stats);
      setChartData(parsed.data.chartData);
      setLastUpdated(new Date(parsed.data.lastUpdated));

      return true;
    } catch (error) {
      console.warn('Error loading dashboard cache:', error);
      return false;
    }
  }, []);

  // Save data to cache (client-side)
  const saveToCache = useCallback((data) => {
    try {
      const cacheData = {
        timestamp: Date.now(),
        data: data
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Error saving dashboard cache:', error);
    }
  }, []);

  // Fetch fresh data and update cache
  const fetchAll = useCallback(async (showLoading = true) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    if (showLoading) {
      if (!hasLoadedOnce) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
    }

    setStatsError('');
    setChartsError('');

    try {
      const [statsRes, chartsRes] = await Promise.all([
        api.getDashboardStats({ signal: abortControllerRef.current.signal }),
        api.getDashboardCharts({ signal: abortControllerRef.current.signal }),
      ]);

      // Stats
      const statsData = statsRes?.data || {};
      const newStats = {
        total_students: statsData.total_students || 0,
        total_programs: statsData.total_programs || 0,
        total_colleges: statsData.total_colleges || 0,
      };
      setStats(newStats);

      // Charts
      const chartsData = chartsRes?.data || {};
      const studentsByProgram = sanitizeProgramData(
        chartsData.students_by_program
      );
      const studentsByCollege = sanitizeCollegeData(
        chartsData.students_by_college
      );

      const newChartData = {
        students_by_program: studentsByProgram,
        students_by_college: studentsByCollege,
      };
      setChartData(newChartData);

      setLastUpdated(new Date());
      setHasLoadedOnce(true);

      // Cache the fresh data
      saveToCache({
        stats: newStats,
        chartData: newChartData,
        lastUpdated: Date.now()
      });

    } catch (err) {
      const genericMessage = 'Failed to load dashboard data';

      const statsMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        genericMessage;

      const chartsMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        genericMessage;

      setStatsError(statsMsg);
      setChartsError(chartsMsg);

      setStats({
        total_students: 0,
        total_programs: 0,
        total_colleges: 0,
      });
      setChartData({
        students_by_program: [],
        students_by_college: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasLoadedOnce, saveToCache]);

  useEffect(() => {
    const startTime = performance.now();

    console.log('🚀 Dashboard: Starting data load...');

    // Try to load from cache first for instant display
    const cacheLoaded = loadFromCache();
    console.log(`⚡ Dashboard: Cache loaded in ${performance.now() - startTime}ms`);

    // Always fetch fresh data to update cache and UI
    console.log(`🌐 Dashboard: Fetching fresh data (showLoading: ${!cacheLoaded})...`);
    fetchAll(!cacheLoaded); // Show loading only if no cache was available
  }, [fetchAll, loadFromCache]);

  useEffect(() => {
    if (!autoRefreshMs) return;

    const id = setInterval(() => {
      fetchAll();
    }, autoRefreshMs);

    return () => clearInterval(id);
  }, [autoRefreshMs, fetchAll]);

  // Cleanup effect for AbortController
  useEffect(() => {
    const currentController = abortControllerRef.current;
    return () => {
      if (currentController) {
        currentController.abort();
      }
    };
  }, []);

  return {
    stats,
    chartData,
    loading,
    statsError,
    chartsError,
    lastUpdated,
    refreshing,
    refresh: fetchAll,
  };
};

/* ------------ Presentational components ----- */

const StatCard = React.memo(({
  title,
  value,
  icon,
  color,
  isMobile,
  isLoading,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      width: '100%',
      border: '1px solid #E2E8F0',
      borderRadius: '18px',
      padding: isMobile ? '16px 18px' : '18px 22px',
      textAlign: 'left',
      background: `radial-gradient(circle at top left, ${color}10, #ffffff)`,
      boxShadow: '0 10px 25px rgba(15, 23, 42, 0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      cursor: onClick ? 'pointer' : 'default',
      transition:
        'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
    }}
    onMouseDown={(e) => {
      e.currentTarget.style.transform = 'scale(0.99)';
    }}
    onMouseUp={(e) => {
      e.currentTarget.style.transform = 'scale(1)';
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow =
        '0 14px 30px rgba(15, 23, 42, 0.06)';
      e.currentTarget.style.borderColor = `${color}50`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow =
        '0 10px 25px rgba(15, 23, 42, 0.04)';
      e.currentTarget.style.borderColor = '#E2E8F0';
      e.currentTarget.style.transform = 'scale(1)';
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      <div
        style={{
          width: isMobile ? 38 : 42,
          height: isMobile ? 38 : 42,
          borderRadius: '999px',
          backgroundColor: `${color}12`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          fontSize: isMobile ? 20 : 22,
        }}
      >
        {icon}
      </div>
      <span
        style={{
          fontSize: isMobile ? 11 : 12,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#94A3B8',
          fontWeight: 600,
        }}
      >
        {title}
      </span>
    </div>

    <div>
      <div
        style={{
          fontSize: isMobile ? 26 : 30,
          fontWeight: 700,
          color: '#0F172A',
          lineHeight: 1.1,
        }}
      >
        {isLoading ? '...' : value.toLocaleString()}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: isMobile ? 11 : 12,
          color: '#64748B',
        }}
      >
        Overview • tap to view details
      </div>
    </div>
  </button>
));

const HorizontalBarChart = React.memo(({ data }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div
        style={{
          height: '220px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9CA3AF',
          fontSize: '14px',
        }}
      >
        No program data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map((item) => item.student_count || 0));

  return (
    <div
      style={{
        maxHeight: 420,
        overflowY: 'auto',
        paddingRight: 8,
      }}
    >
      {data.map((item, index) => {
        const count = item.student_count || 0;
        const width = maxCount > 0 ? (count / maxCount) * 100 : 0;

        return (
          <div
            key={(item.program_code || item.program_name || index) + index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '6px 2px',
            }}
          >
            {/* Rank pill */}
            <div
              style={{
                minWidth: 24,
                height: 24,
                borderRadius: 999,
                backgroundColor: index < 3 ? '#DBEAFE' : '#F1F5F9',
                color: index < 3 ? '#1D4ED8' : '#64748B',
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {index + 1}
            </div>

            {/* Label + bar */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: '#0F172A',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
                title={item.program_name}
              >
                {item.program_name}
              </div>

              <div
                style={{
                  position: 'relative',
                  height: 18,
                  borderRadius: 999,
                  backgroundColor: '#E5E7EB',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${Math.min(width, 100)}%`,
                    background:
                      'linear-gradient(90deg, #2563EB 0%, #3B82F6 50%, #60A5FA 100%)',
                    borderRadius: 999,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>

            {/* Value */}
            <div
              style={{
                minWidth: 40,
                textAlign: 'right',
                fontSize: 12,
                fontWeight: 600,
                color: '#0F172A',
              }}
            >
              {count.toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
});

const PieChartWithLegend = React.memo(({ data }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div
        style={{
          height: '220px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9CA3AF',
          fontSize: '14px',
        }}
      >
        No college data available
      </div>
    );
  }

  const total = data.reduce(
    (sum, item) => sum + (item.student_count || 0),
    0
  );
  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#06b6d4',
    '#f97316',
    '#84cc16',
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        height: 450,
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: 6,
        }}
      >
        {data.map((item, index) => {
          const count = item.student_count || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const color = colors[index % colors.length];

          return (
            <div
              key={item.college_code || item.college_name || index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: '8px 6px',
                borderRadius: 8,
                backgroundColor:
                  index % 2 === 0 ? '#F9FAFB' : 'transparent',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      backgroundColor: color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#0F172A',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                    }}
                    title={item.college_name}
                  >
                    {item.college_name}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: '#6B7280',
                    }}
                  >
                    {pct}%
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#0F172A',
                    }}
                  >
                    {count.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Mini bar */}
              <div
                style={{
                  position: 'relative',
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: '#E5E7EB',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${pct}%`,
                    background: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div
        style={{
          padding: '14px 18px',
          borderRadius: 12,
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#0F172A',
            marginBottom: 2,
          }}
        >
          {total.toLocaleString()} Students
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#6B7280',
          }}
        >
          Across{' '}
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 999,
              backgroundColor: '#E5EDFF',
              color: '#1D4ED8',
              fontWeight: 600,
              margin: '0 4px',
            }}
          >
            {data.length}
          </span>
          College{data.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
});

/* ------------ Main Dashboard ---------------- */

const Dashboard = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
const { stats, chartData, loading, statsError, chartsError } =
    useDashboardData(0);

// Use chart data immediately, show empty state or minimal placeholders for smooth UX
const displayChartData = {
  students_by_program: chartData.students_by_program.length > 0 ? chartData.students_by_program : [],
  students_by_college: chartData.students_by_college.length > 0 ? chartData.students_by_college : []
};



const hasError = Boolean(statsError || chartsError);

  const handleNavigateStudents = () => navigate('/students');
  const handleNavigatePrograms = () => navigate('/programs');
  const handleNavigateColleges = () => navigate('/colleges');

  return (
    <div
      style={{
        backgroundColor: '#F9FAFB',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: isMobile ? '16px 16px 24px' : '24px 24px 32px',
        }}
      >
        {/* Header */}
        <div
          style={{
            marginBottom: isMobile ? '20px' : '24px',
          }}
        >
          <h1
            style={{
              fontSize: isMobile ? '24px' : '28px',
              fontWeight: 700,
              color: '#111827',
              margin: '0 0 4px 0',
            }}
          >
            Dashboard
          </h1>
          <p
            style={{
              color: '#6B7280',
              fontSize: isMobile ? '14px' : '15px',
              margin: 0,
            }}
          >
            Welcome to InsTrack - Student Information System Overview
          </p>
        </div>

        {/* Error banner */}
        {hasError && (
          <div
            style={{
              marginBottom: '16px',
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#B91C1C',
              fontSize: 13,
            }}
          >
            <strong style={{ marginRight: 4 }}>
              Some data may be incomplete.
            </strong>
            <span>{statsError || chartsError}</span>
          </div>
        )}

        {/* Stat cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: isMobile ? '16px' : '24px',
            marginBottom: isMobile ? '28px' : '32px',
          }}
        >
          <StatCard
            title="Total Students"
            value={stats.total_students}
            icon={<FiUsers />}
            color="#3182ce"
            isMobile={isMobile}
            isLoading={loading}
            onClick={handleNavigateStudents}
          />
          <StatCard
            title="Total Programs"
            value={stats.total_programs}
            icon={<FiBookOpen />}
            color="#38a169"
            isMobile={isMobile}
            isLoading={loading}
            onClick={handleNavigatePrograms}
          />
          <StatCard
            title="Total Colleges"
            value={stats.total_colleges}
            icon={<FiHome />}
            color="#d69e2e"
            isMobile={isMobile}
            isLoading={loading}
            onClick={handleNavigateColleges}
          />
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            backgroundColor: '#E5E7EB',
            margin: isMobile ? '8px 0 20px' : '12px 0 24px',
          }}
        />

        {/* Charts section */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? 'repeat(1, 1fr)'
              : 'repeat(12, 1fr)',
            gap: isMobile ? '20px' : '24px',
            alignItems: 'start',
          }}
        >
          {/* Students by Program */}
          <div
            style={{
              gridColumn: isMobile ? 'span 12' : 'span 6',
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: isMobile ? '16px' : '22px',
              boxShadow: '0 10px 25px rgba(15, 23, 42, 0.03)',
              border: '1px solid #E2E8F0',
              minHeight: 520,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  fontSize: isMobile ? 16 : 18,
                  fontWeight: 600,
                  color: '#111827',
                  margin: 0,
                }}
              >
                Students by Program
              </h3>
              <span
                style={{
                  fontSize: 11,
                  color: '#9CA3AF',
                }}
              >
                Top programs by student count
              </span>
            </div>

            <HorizontalBarChart data={displayChartData.students_by_program} />
          </div>

          {/* Students by College */}
          <div
            style={{
              gridColumn: isMobile ? 'span 12' : 'span 6',
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: isMobile ? '16px' : '22px',
              boxShadow: '0 10px 25px rgba(15, 23, 42, 0.03)',
              border: '1px solid #E2E8F0',
              minHeight: 520,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  fontSize: isMobile ? 16 : 18,
                  fontWeight: 600,
                  color: '#111827',
                  margin: 0,
                }}
              >
                Students by College
              </h3>
              <span
                style={{
                  fontSize: 11,
                  color: '#9CA3AF',
                }}
              >
                Distribution of students across colleges
              </span>
            </div>

            <PieChartWithLegend data={displayChartData.students_by_college} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
