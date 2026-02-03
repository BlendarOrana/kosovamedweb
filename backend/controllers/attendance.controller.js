// src/controllers/attendance.controller.js

import { promisePool } from "../lib/db.js";

// Check in (No changes needed)
export const checkIn = async (req, res) => {
  const userId = req.user.id;
  try {
    // Check if there's already an open check-in (most recent by id)
    const existingCheckIn = await promisePool.query(`
      SELECT id FROM attendance 
      WHERE user_id = $1 AND check_out_time IS NULL
      ORDER BY id DESC
      LIMIT 1
    `, [userId]);

    if (existingCheckIn.rows.length > 0) {
      return res.status(400).json({ message: "Already checked in" });
    }

    const result = await promisePool.query(`
      INSERT INTO attendance (user_id, check_in_time)
      VALUES ($1, CURRENT_TIMESTAMP)
      RETURNING id, check_in_time
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
    // Find the most recent open check-in by id and close it
    const result = await promisePool.query(`
      UPDATE attendance 
      SET check_out_time = CURRENT_TIMESTAMP
      WHERE id = (
        SELECT id FROM attendance 
        WHERE user_id = $1 AND check_out_time IS NULL
        ORDER BY id DESC
        LIMIT 1
      )
      RETURNING id, check_in_time, check_out_time
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "No active check-in found" });
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

export const getTodayStatus = async (req, res) => {
  const userId = req.user.id;
  try {
    // Check for an active open check-in first
    const activeCheckIn = await promisePool.query(`
      SELECT id, check_in_time, check_out_time
      FROM attendance 
      WHERE user_id = $1 AND check_out_time IS NULL
      ORDER BY id DESC
      LIMIT 1
    `, [userId]);

    if (activeCheckIn.rows.length > 0) {
      return res.json({
        status: "checked-in",
        record: activeCheckIn.rows[0]
      });
    }

    // No open check-in, grab the most recent completed record
    const lastRecord = await promisePool.query(`
      SELECT id, check_in_time, check_out_time
      FROM attendance 
      WHERE user_id = $1
      ORDER BY id DESC
      LIMIT 1
    `, [userId]);

    res.json({
      status: "checked-out",
      record: lastRecord.rows[0] || null
    });
  } catch (error) {
    console.error("Error fetching status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

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

