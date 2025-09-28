import bcrypt from 'bcryptjs';
import { promisePool } from "../lib/db.js";

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const result = await promisePool.query(`
      SELECT id, name, number, role, active
      FROM users
      ORDER BY id DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single user by ID
export const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await promisePool.query(`
      SELECT id, name, number, role, active
      FROM users
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create a new user
export const createUser = async (req, res) => {
  const { 
    name, 
    password, 
    number, 
    role, 
    active
  } = req.body;

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Set default values for optional fields
    const isActive = active !== undefined ? active : true;
    const userRole = role || 'shop'; // Default role is 'shop'
    
    // Insert the new user
    const result = await promisePool.query(`
      INSERT INTO users (name, password, number, role, active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, number, role, active
    `, [name, hashedPassword, number, userRole, isActive]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update a user
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { 
    name, 
    number, 
    role, 
    active
  } = req.body;
  
  try {
    // Update the user
    const result = await promisePool.query(`
      UPDATE users
      SET name = $1, number = $2, role = $3, active = $4
      WHERE id = $5
      RETURNING id, name, number, role, active
    `, [name, number, role, active, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Change user password
export const changeUserPassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  
  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update only the password
    const result = await promisePool.query(`
      UPDATE users
      SET password = $1
      WHERE id = $2
      RETURNING id
    `, [hashedPassword, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a user
export const deleteUser = async (req, res) => {
  const { id } = req.params;
  
  try {
    // First check if the user exists
    const checkResult = await promisePool.query('SELECT id FROM users WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete the user
    await promisePool.query('DELETE FROM users WHERE id = $1', [id]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Keep the delivery-related functions unchanged
export const getUnreadDeliveriesCount = async (req, res) => {
  try {
    // Note: We assume any admin can see the total count.
    // There's no specific admin_id filter here.
    const countQuery = `
      SELECT COUNT(*) as count
      FROM deliveries 
      WHERE read_by_admin = false
    `;

    const result = await promisePool.query(countQuery);
    const count = parseInt(result.rows[0].count);

    return res.json({
      success: true,
      count: count
    });

  } catch (error) {
    console.error("Error fetching unread deliveries count:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const markDeliveriesAsRead = async (req, res) => {
  try {
    // Array of delivery IDs, or undefined/empty to mark all as read
    const { deliveryIds } = req.body; 

    let query;
    let values;

    if (deliveryIds && deliveryIds.length > 0) {
      // Mark specific deliveries as read
      // Create placeholders like $1, $2, $3...
      const placeholders = deliveryIds.map((_, index) => `$${index + 1}`).join(',');
      query = `
        UPDATE deliveries 
        SET read_by_admin = true 
        WHERE id IN (${placeholders}) AND read_by_admin = false
      `;
      values = deliveryIds;
    } else {
      // Mark ALL unread deliveries as read
      query = `
        UPDATE deliveries 
        SET read_by_admin = true 
        WHERE read_by_admin = false
      `;
      values = []; // No values needed for this query
    }

    const result = await promisePool.query(query, values);
    const updatedCount = result.rowCount; // rowCount tells us how many rows were actually updated

    return res.json({
      success: true,
      message: `${updatedCount} deliveries marked as read`,
      updatedCount: updatedCount
    });

  } catch (error) {
    console.error("Error marking deliveries as read:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};