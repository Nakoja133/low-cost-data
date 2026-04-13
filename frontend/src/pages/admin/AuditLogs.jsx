import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import MobileMenu from '../../components/MobileMenu';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    action: '',
    entity_type: '',
    status: '',
  });
  const [stats, setStats] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 25,
        ...Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== '')
        ),
      });

      const response = await axios.get(`/api/admin/audit-logs?${params}`);
      setLogs(response.data.data);
      setTotal(response.data.pagination.total);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/admin/audit-logs/stats');
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch audit stats:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionColor = (action) => {
    const colors = {
      'create': 'rgba(16,185,129,0.15)',
      'update': 'rgba(59,130,246,0.15)',
      'delete': 'rgba(239,68,68,0.15)',
      'approve': 'rgba(16,185,129,0.15)',
      'reject': 'rgba(239,68,68,0.15)',
    };
    const textColor = {
      'create': '#10b981',
      'update': '#3b82f6',
      'delete': '#ef4444',
      'approve': '#10b981',
      'reject': '#ef4444',
    };
    return {
      bg: colors[action?.toLowerCase()] || 'rgba(148,163,184,0.15)',
      color: textColor[action?.toLowerCase()] || '#94a3b8'
    };
  };

  const getStatusColor = (status) => {
    return status === 'success'
      ? { bg: 'rgba(16,185,129,0.15)', color: '#10b981' }
      : { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' };
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <MobileMenu currentPage="/admin/audit-logs" />

      <main className="main-content" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem 0' }}>📋 Audit Logs</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Track all admin actions for compliance and debugging
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Total Logs</p>
              <p style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>{stats.total_logs}</p>
            </div>
            <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Last 24h</p>
              <p style={{ fontSize: '1.5rem', fontWeight: '800', color: '#3b82f6', margin: 0 }}>{stats.logs_24h}</p>
            </div>
            <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Successful</p>
              <p style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981', margin: 0 }}>{stats.successful_actions}</p>
            </div>
            <div style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Failed</p>
              <p style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ef4444', margin: 0 }}>{stats.failed_actions}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ background: 'var(--card-bg)', padding: '1.25rem', borderRadius: '0.875rem', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', margin: '0 0 1rem 0' }}>Filters</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <input
              type="text"
              placeholder="Action (e.g., create, update)"
              style={{ padding: '0.625rem 0.875rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
            />
            <input
              type="text"
              placeholder="Entity Type (e.g., user, order)"
              style={{ padding: '0.625rem 0.875rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
              value={filters.entity_type}
              onChange={(e) => handleFilterChange('entity_type', e.target.value)}
            />
            <select
              style={{ padding: '0.625rem 0.875rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div style={{ background: 'var(--card-bg)', borderRadius: '0.875rem', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 1rem' }} />
              Loading audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No audit logs found
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</th>
                    <th style={{ textAlign: 'left', padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin</th>
                    <th style={{ textAlign: 'left', padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                    <th style={{ textAlign: 'left', padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entity</th>
                    <th style={{ textAlign: 'left', padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</th>
                    <th style={{ textAlign: 'left', padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  </tr>
                </thead>
                <tbody style={{ divideY: '1px solid var(--border-color)' }}>
                  {logs.map((log) => {
                    const actionColors = getActionColor(log.action);
                    const statusColors = getStatusColor(log.status);
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = ''}
                      >
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {formatDate(log.created_at)}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {log.admin_id?.substring(0, 8) || 'System'}
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.625rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: actionColors.bg,
                            color: actionColors.color,
                            textTransform: 'lowercase'
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {log.entity_type} {log.entity_id && `(${log.entity_id?.substring(0, 8)})`}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {log.description}
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.625rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: statusColors.bg,
                            color: statusColors.color
                          }}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Showing {(page - 1) * 25 + 1} to {Math.min(page * 25, total)} of {total}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: '0.5rem 0.875rem',
                    background: page === 1 ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    opacity: page === 1 ? 0.5 : 1
                  }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * 25 >= total}
                  style={{
                    padding: '0.5rem 0.875rem',
                    background: page * 25 >= total ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    color: page * 25 >= total ? 'var(--text-muted)' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    cursor: page * 25 >= total ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    opacity: page * 25 >= total ? 0.5 : 1
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border-color);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .main-content {
          padding-top: 1rem;
        }
        @media (max-width: 767px) {
          .main-content {
            padding-top: 0.75rem;
            padding-bottom: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}