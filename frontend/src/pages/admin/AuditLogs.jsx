import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';

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
      'create': 'bg-green-100 text-green-800',
      'update': 'bg-blue-100 text-blue-800',
      'delete': 'bg-red-100 text-red-800',
      'approve': 'bg-green-100 text-green-800',
      'reject': 'bg-red-100 text-red-800',
    };
    return colors[action?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    return status === 'success'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-2">Track all admin actions for compliance and debugging</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-600 text-sm">Total Logs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_logs}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-600 text-sm">Last 24h</p>
              <p className="text-2xl font-bold text-blue-600">{stats.logs_24h}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-600 text-sm">Successful</p>
              <p className="text-2xl font-bold text-green-600">{stats.successful_actions}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="text-gray-600 text-sm">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed_actions}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Action (e.g., create, update)"
              className="border border-gray-300 rounded px-3 py-2 text-sm"
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
            />
            <input
              type="text"
              placeholder="Entity Type (e.g., user, order)"
              className="border border-gray-300 rounded px-3 py-2 text-sm"
              value={filters.entity_type}
              onChange={(e) => handleFilterChange('entity_type', e.target.value)}
            />
            <select
              className="border border-gray-300 rounded px-3 py-2 text-sm"
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No audit logs found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Admin
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Entity
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {log.admin_id?.substring(0, 8) || 'System'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.entity_type} {log.entity_id && `(${log.entity_id?.substring(0, 8)})`}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.description}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Showing {(page - 1) * 25 + 1} to {Math.min(page * 25, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 bg-gray-200 text-gray-800 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * 25 >= total}
                  className="px-3 py-2 bg-gray-200 text-gray-800 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
