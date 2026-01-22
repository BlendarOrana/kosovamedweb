import { promisePool } from "../lib/db.js";
import { getCloudFrontUrl } from "../lib/s3.js";

// Get available users for replacement (same region, exclude self)
export const getAvailableReplacements = async (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;
  
  try {
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required" });
    }

    const result = await promisePool.query(`
      SELECT DISTINCT u.id, u.name, u.profile_image_url
      FROM users u
      WHERE u.active = true
      AND u.region = (SELECT region FROM users WHERE id = $1)
      AND u.id != $1
      AND u.id NOT IN (
        -- Users who have approved/pending vacations during the period
        SELECT user_id FROM vacations
        WHERE status IN ('approved', 'pending_manager_approval', 'pending_replacement_acceptance')
        AND (
          (start_date <= $2 AND end_date >= $2) OR
          (start_date <= $3 AND end_date >= $3) OR
          (start_date >= $2 AND end_date <= $3)
        )
      )
      AND u.id NOT IN (
        -- Users who are already replacements for approved/pending vacations during the period
        SELECT replacement_user_id FROM vacations
        WHERE replacement_status = 'accepted'
        AND status IN ('approved', 'pending_manager_approval', 'pending_admin_approval')
        AND (
          (start_date <= $2 AND end_date >= $2) OR
          (start_date <= $3 AND end_date >= $3) OR
          (start_date >= $2 AND end_date <= $3)
        )
      )
      ORDER BY u.name ASC
    `, [userId, startDate, endDate]);

    // Transform the results to include CloudFront URLs
    const usersWithImages = result.rows.map(user => ({
      ...user,
      profile_image_url: getCloudFrontUrl(user.profile_image_url)
    }));

    res.json(usersWithImages);
  } catch (error) {
    console.error("Error fetching available replacements:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// User requests vacation with replacement
export const requestVacation = async (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate, replacementUserId } = req.body;
  
  try {
    if (!replacementUserId) {
      return res.status(400).json({ message: "Replacement user is required" });
    }

    if (replacementUserId === userId) {
      return res.status(400).json({ message: "Cannot select yourself as replacement" });
    }



    // Check overlap
    const overlap = await promisePool.query(`
      SELECT id FROM vacations 
      WHERE user_id = $1 AND status NOT IN ('rejected', 'declined') AND (
        (start_date <= $2 AND end_date >= $2) OR
        (start_date <= $3 AND end_date >= $3) OR
        (start_date >= $2 AND end_date <= $3)
      )
    `, [userId, startDate, endDate]);

    if (overlap.rows.length > 0) {
      return res.status(400).json({ message: "Vacation dates overlap with existing request" });
    }

    // Create vacation request
    const result = await promisePool.query(`
      INSERT INTO vacations (
        user_id, 
        start_date, 
        end_date, 
        replacement_user_id,
        status,
        replacement_status
      )
      VALUES ($1, $2, $3, $4, 'pending_replacement_acceptance', 'pending')
      RETURNING id, start_date, end_date, status, replacement_status, requested_at
    `, [userId, startDate, endDate, replacementUserId]);

    res.status(201).json({
      message: "Vacation request submitted, waiting for replacement acceptance",
      vacation: result.rows[0]
    });
  } catch (error) {
    console.error("Error requesting vacation:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user's vacation requests
export const getMyVacations = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await promisePool.query(`
      SELECT 
        v.*,
        requester.name as requester_name,
        replacement.name as replacement_name,
        manager.name as manager_name,
        admin.name as admin_name
      FROM vacations v
      LEFT JOIN users requester ON v.user_id = requester.id
      LEFT JOIN users replacement ON v.replacement_user_id = replacement.id
      LEFT JOIN users manager ON v.manager_approver_id = manager.id
      LEFT JOIN users admin ON v.admin_approver_id = admin.id
      WHERE v.user_id = $1
      ORDER BY v.requested_at DESC
    `, [userId]);
    
    const unseenCount = await promisePool.query(`
      SELECT COUNT(*) as count
      FROM vacations
      WHERE user_id = $1 
      AND status IN ('approved', 'rejected')
      AND is_seen = false
    `, [userId]);
    
    res.json({
      vacations: result.rows,
      unseenCount: parseInt(unseenCount.rows[0].count)
    });
  } catch (error) {
    console.error("Error fetching vacations:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get vacations where current user is selected as replacement
export const getReplacementRequests = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await promisePool.query(`
      SELECT 
        v.*,
        requester.name as requester_name
      FROM vacations v
      JOIN users requester ON v.user_id = requester.id
      WHERE v.replacement_user_id = $1 
      AND v.replacement_status = 'pending'
      ORDER BY v.requested_at DESC
    `, [userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching replacement requests:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Replacement user responds
export const respondToReplacement = async (req, res) => {
  const { id } = req.params;
  const { accept } = req.body; // true or false
  const userId = req.user.id;

  try {
    const checkVacation = await promisePool.query(`
      SELECT * FROM vacations 
      WHERE id = $1 AND replacement_user_id = $2 AND replacement_status = 'pending'
    `, [id, userId]);

    if (checkVacation.rows.length === 0) {
      return res.status(404).json({ message: "Replacement request not found" });
    }

    const newStatus = accept ? 'pending_manager_approval' : 'rejected';
    const replacementStatus = accept ? 'accepted' : 'declined';

    const result = await promisePool.query(`
      UPDATE vacations 
      SET 
        status = $1,
        replacement_status = $2
      WHERE id = $3
      RETURNING *
    `, [newStatus, replacementStatus, id]);

    res.json({
      message: accept ? "Replacement accepted, forwarded to manager" : "Replacement declined",
      vacation: result.rows[0]
    });
  } catch (error) {
    console.error("Error responding to replacement:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Manager: Get pending vacation requests
export const getManagerVacations = async (req, res) => {
  const managerId = req.user.id; // Get the manager's ID from the authenticated user
  const { status } = req.query;
  
  try {
    let query = `
      SELECT 
        v.*,
        u1.name as employee_name,
        u1.title as employee_title,
        u1.region as employee_region,
        u2.name as replacement_name,
        u2.title as replacement_title,
        u2.region as replacement_region
      FROM vacations v
      LEFT JOIN users u1 ON v.user_id = u1.id
      LEFT JOIN users u2 ON v.replacement_user_id = u2.id
      WHERE u1.region = (SELECT region FROM users WHERE id = $1)
    `;
    
    const params = [managerId];
    
    if (status) {
      params.push(status);
      query += ` AND v.status = $${params.length}`;
    } else {
      // Show all vacations that the manager has dealt with or needs to deal with
      query += ` AND (v.status = 'pending_manager_approval' OR v.status = 'pending_admin_approval' OR v.status = 'manager_rejected' OR v.status = 'approved')`;
    }
    
    query += ` ORDER BY v.requested_at DESC`;
    
    const result = await promisePool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching manager vacations:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// Manager responds
export const managerRespondToVacation = async (req, res) => {
  const { id } = req.params;
  const { approve, comment } = req.body;
  const managerId = req.user.id;

  try {
    if (approve === undefined) {
      return res.status(400).json({ message: "Approval status is required" });
    }

    const newStatus = approve ? 'pending_admin_approval' : 'rejected';

    const result = await promisePool.query(`
      UPDATE vacations 
      SET 
        status = $1,
        manager_approver_id = $2,
        admin_comment = $3
      WHERE id = $4 AND status = 'pending_manager_approval'
      RETURNING *
    `, [newStatus, managerId, comment || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Vacation request not found or already processed" });
    }

    res.json({
      message: approve ? "Approved, forwarded to admin" : "Rejected by manager",
      vacation: result.rows[0]
    });
  } catch (error) {
    console.error("Error manager responding to vacation:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Get all vacation requests
export const getAllVacations = async (req, res) => {
  const { status } = req.query;
  try {
    let query = `
      SELECT 
        v.*,
        requester.name as employee_name,
        requester.title as employee_title,
        requester.region as employee_region,
        replacement.name as replacement_name,
        replacement.title as replacement_title,
        replacement.region as replacement_region,
        manager.name as manager_name,
        admin.name as admin_name
      FROM vacations v
      JOIN users requester ON v.user_id = requester.id
      LEFT JOIN users replacement ON v.replacement_user_id = replacement.id
      LEFT JOIN users manager ON v.manager_approver_id = manager.id
      LEFT JOIN users admin ON v.admin_approver_id = admin.id
      WHERE 1=1
    `;
    const params = [];
    if (status) {
      params.push(status);
      query += ` AND v.status = $${params.length}`;
    }
    query += ` ORDER BY v.requested_at DESC`;
    const result = await promisePool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching vacation requests:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// Admin responds (final approval)
export const respondToVacation = async (req, res) => {
  const { id } = req.params;
  const { status, admin_comment } = req.body;
  const adminId = req.user.id;

  try {
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
    }
    
    if (status === 'rejected' && (!admin_comment || admin_comment.trim() === '')) {
      return res.status(400).json({ message: "A comment is required when rejecting a vacation request" });
    }

    const result = await promisePool.query(`
      UPDATE vacations 
      SET 
        status = $1,
        admin_approver_id = $2,
        admin_comment = $3
      WHERE id = $4 AND status = 'pending_admin_approval'
      RETURNING *
    `, [status, adminId, admin_comment, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Vacation request not found or already processed" });
    }

    res.json({
      message: `Vacation request ${status}`,
      vacation: result.rows[0]
    });
  } catch (error) {
    console.error("Error responding to vacation:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Mark vacation as seen
export const markVacationAsSeen = async (req, res) => {
  const userId = req.user.id;
  const { vacationId } = req.params;
  
  try {
    await promisePool.query(`
      UPDATE vacations 
      SET is_seen = true 
      WHERE id = $1 AND user_id = $2
    `, [vacationId, userId]);
    
    res.json({ message: "Marked as seen" });
  } catch (error) {
    console.error("Error marking vacation as seen:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Mark all vacations as seen
export const markAllVacationsAsSeen = async (req, res) => {
  const userId = req.user.id;
  
  try {
    await promisePool.query(`
      UPDATE vacations 
      SET is_seen = true 
      WHERE user_id = $1 AND status IN ('approved', 'rejected')
    `, [userId]);
    
    res.json({ message: "All marked as seen" });
  } catch (error) {
    console.error("Error marking all vacations as seen:", error);
    res.status(500).json({ message: "Server error" });
  }
};