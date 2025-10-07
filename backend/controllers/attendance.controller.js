// src/controllers/attendance.controller.js

import { promisePool } from "../lib/db.js";

// Check in (No changes needed)
export const checkIn = async (req, res) => {
  const userId = req.user.id;
  try {
    // Use database timezone for date comparison instead of local time
    const existingCheckIn = await promisePool.query(`
      SELECT id FROM attendance 
      WHERE user_id = $1 
      AND DATE(check_in_time AT TIME ZONE 'Europe/Belgrade') = CURRENT_DATE 
      AND check_out_time IS NULL
    `, [userId]);
    
    if (existingCheckIn.rows.length > 0) {
      return res.status(400).json({ message: "Already checked in today" });
    }
    
    const result = await promisePool.query(`
      INSERT INTO attendance (user_id, check_in_time)
      VALUES ($1, CURRENT_TIMESTAMP)
      RETURNING id, check_in_time AT TIME ZONE 'Europe/Belgrade' as check_in_time
    `, [userId]);
    
    res.json({
      message: "Checked in successfully",
      attendance: result.rows[0]
    });
  } catch (error) {
    console.error("Error in check-in:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const checkOut = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await promisePool.query(`
      UPDATE attendance 
      SET check_out_time = CURRENT_TIMESTAMP
      WHERE user_id = $1 
      AND DATE(check_in_time AT TIME ZONE 'Europe/Belgrade') = CURRENT_DATE 
      AND check_out_time IS NULL
      RETURNING id, 
        check_in_time AT TIME ZONE 'Europe/Belgrade' as check_in_time,
        check_out_time AT TIME ZONE 'Europe/Belgrade' as check_out_time
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "No active check-in found for today" });
    }
    
    res.json({
      message: "Checked out successfully",
      attendance: result.rows[0]
    });
  } catch (error) {
    console.error("Error in check-out:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user's attendance history (No changes needed)
export const getMyAttendance = async (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate, limit = 50 } = req.query;
  try {
    let query = `
      SELECT id, check_in_time, check_out_time, 
             EXTRACT(EPOCH FROM (check_out_time - check_in_time))/3600 as hours_worked
      FROM attendance 
      WHERE user_id = $1
    `;
    const params = [userId];
    if (startDate) {
      params.push(startDate);
      query += ` AND DATE(check_in_time) >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND DATE(check_in_time) <= $${params.length}`;
    }
    query += ` ORDER BY check_in_time DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    const result = await promisePool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Request vacation (No changes needed)
export const requestVacation = async (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.body;
  try {
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: "End date must be after start date" });
    }
    const overlap = await promisePool.query(`
      SELECT id FROM vacations 
      WHERE user_id = $1 AND status != 'rejected' AND (
        (start_date <= $2 AND end_date >= $2) OR
        (start_date <= $3 AND end_date >= $3) OR
        (start_date >= $2 AND end_date <= $3)
      )
    `, [userId, startDate, endDate]);
    if (overlap.rows.length > 0) {
      return res.status(400).json({ message: "Vacation dates overlap with existing request" });
    }
    const result = await promisePool.query(`
      INSERT INTO vacations (user_id, start_date, end_date)
      VALUES ($1, $2, $3)
      RETURNING id, start_date, end_date, status, requested_at
    `, [userId, startDate, endDate]);
    res.status(201).json({
      message: "Vacation request submitted",
      vacation: result.rows[0]
    });
  } catch (error) {
    console.error("Error requesting vacation:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user's vacation requests (No changes needed)
export const getMyVacations = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await promisePool.query(`
      SELECT v.*, u.name as reviewer_name
      FROM vacations v
      LEFT JOIN users u ON v.reviewed_by = u.id
      WHERE v.user_id = $1
      ORDER BY v.requested_at DESC
    `, [userId]);
    
    // Count unseen notifications (approved or rejected that haven't been seen)
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

// New endpoint to mark vacations as seen
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



// Admin: Get all attendance records (No changes needed)
export const getAllAttendance = async (req, res) => {
  const { startDate, endDate, userId, limit = 100 } = req.query;
  try {
    let query = `
      SELECT a.*, u.name as user_name,
             EXTRACT(EPOCH FROM (a.check_out_time - a.check_in_time))/3600 as hours_worked
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (userId) {
      params.push(userId);
      query += ` AND a.user_id = $${params.length}`;
    }
    if (startDate) {
      params.push(startDate);
      query += ` AND DATE(a.check_in_time) >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND DATE(a.check_in_time) <= $${params.length}`;
    }
    query += ` ORDER BY a.check_in_time DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    const result = await promisePool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching all attendance:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Get all vacation requests (No changes needed)
export const getAllVacations = async (req, res) => {
  const { status } = req.query;
  try {
    let query = `
      SELECT v.*, u.name as user_name, r.name as reviewer_name
      FROM vacations v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN users r ON v.reviewed_by = r.id
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

// *** MODIFIED FOR BETTER UX ***
// Admin: Respond to vacation request
export const respondToVacation = async (req, res) => {
  const { id } = req.params;
  const { status, admin_comment } = req.body; // 'approved' or 'rejected', and a comment
  const reviewerId = req.user.id;

  try {
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
    }
    
    // Require a comment if the status is 'rejected'
    if (status === 'rejected' && (!admin_comment || admin_comment.trim() === '')) {
      return res.status(400).json({ message: "A comment is required when rejecting a vacation request" });
    }

    const result = await promisePool.query(`
      UPDATE vacations 
      SET status = $1, reviewed_by = $2, admin_comment = $3
      WHERE id = $4 AND status = 'pending'
      RETURNING *
    `, [status, reviewerId, admin_comment, id]);

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