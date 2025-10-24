// src/controllers/attendance.controller.js

import { promisePool } from "../lib/db.js";

// Check in (No changes needed)
export const checkIn = async (req, res) => {
  const userId = req.user.id;
  try {
    const today = new Date().toISOString().split('T')[0];
    const existingCheckIn = await promisePool.query(`
      SELECT id FROM attendance 
      WHERE user_id = $1 AND DATE(check_in_time) = $2 AND check_out_time IS NULL
    `, [userId, today]);
    if (existingCheckIn.rows.length > 0) {
      return res.status(400).json({ message: "Already checked in today" });
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

// Check out (No changes needed)
export const checkOut = async (req, res) => {
  const userId = req.user.id;
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await promisePool.query(`
      UPDATE attendance 
      SET check_out_time = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND DATE(check_in_time) = $2 AND check_out_time IS NULL
      RETURNING id, check_in_time, check_out_time
    `, [userId, today]);
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

// Add this new controller
export const getTodayStatus = async (req, res) => {
  const userId = req.user.id;
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await promisePool.query(`
      SELECT id, check_in_time, check_out_time
      FROM attendance 
      WHERE user_id = $1 AND DATE(check_in_time) = $2
      ORDER BY check_in_time DESC
      LIMIT 1
    `, [userId, today]);
    
    if (result.rows.length === 0) {
      return res.json({ 
        status: 'checked-out', 
        record: null 
      });
    }
    
    const record = result.rows[0];
    res.json({
      status: record.check_out_time ? 'checked-out' : 'checked-in',
      record: record
    });
  } catch (error) {
    console.error("Error fetching today's status:", error);
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

