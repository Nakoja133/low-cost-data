const pool = require('../config/database');

// ── GET AUDIT LOGS ────────────────────────────────────────────────
// Returns paginated audit logs filtered by date, admin, action, or entity
exports.getAuditLogs = async (req, res) => {
  const { action, entity_type, admin_id, status, limit = 50, page = 1 } = req.query;

  try {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (action) {
      query += ` AND action = $${paramCount}`;
      params.push(action);
      paramCount++;
    }

    if (entity_type) {
      query += ` AND entity_type = $${paramCount}`;
      params.push(entity_type);
      paramCount++;
    }

    if (admin_id) {
      query += ` AND admin_id = $${paramCount}`;
      params.push(admin_id);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    const countParams = [];
    let countParamCount = 1;

    if (action) {
      countQuery += ` AND action = $${countParamCount}`;
      countParams.push(action);
      countParamCount++;
    }
    if (entity_type) {
      countQuery += ` AND entity_type = $${countParamCount}`;
      countParams.push(entity_type);
      countParamCount++;
    }
    if (admin_id) {
      countQuery += ` AND admin_id = $${countParamCount}`;
      countParams.push(admin_id);
      countParamCount++;
    }
    if (status) {
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
      countParamCount++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Failed to fetch audit logs:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

// ── LOG AUDIT ACTION ────────────────────────────────────────────────
// Helper function to be called whenever admin performs an action
exports.logAuditAction = async (adminId, action, entityType, entityId, oldValue, newValue, description, ipAddress, status = 'success', errorMessage = null) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, old_value, new_value, description, ip_address, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        adminId,
        action,
        entityType,
        entityId,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        description,
        ipAddress,
        status,
        errorMessage
      ]
    );
  } catch (err) {
    console.error('Failed to log audit action:', err);
  }
};

// ── GET AUDIT LOG STATS ───────────────────────────────────────────
// Summary stats for audit dashboard
exports.getAuditStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_logs,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 END) as logs_24h,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_actions,
        COUNT(CASE WHEN status = 'failure' THEN 1 END) as failed_actions,
        COUNT(DISTINCT admin_id) as unique_admins,
        COUNT(DISTINCT entity_type) as entity_types
      FROM audit_logs
    `);

    res.json({ data: stats.rows[0] });
  } catch (err) {
    console.error('Failed to fetch audit stats:', err);
    res.status(500).json({ error: 'Failed to fetch audit stats' });
  }
};

// ── GET ACTIONS BY ENTITY ────────────────────────────────────────
// Retrieve all actions performed on a specific entity
exports.getEntityAuditHistory = async (req, res) => {
  const { entityType, entityId } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM audit_logs 
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC`,
      [entityType, entityId]
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('Failed to fetch entity audit history:', err);
    res.status(500).json({ error: 'Failed to fetch entity audit history' });
  }
};

// ── DELETE OLD AUDIT LOGS ────────────────────────────────────────
// Cleanup job - delete logs older than specified days (default 90)
exports.cleanupOldAuditLogs = async (days = 90) => {
  try {
    const result = await pool.query(
      `DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '${days} days'`
    );
    console.log(`Deleted ${result.rowCount} old audit logs (${days} days old)`);
    return result.rowCount;
  } catch (err) {
    console.error('Failed to cleanup audit logs:', err);
  }
};
