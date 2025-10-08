import ExcelJS from 'exceljs';
import { promisePool } from "../lib/db.js";

export const generateAttendanceReport = async (req, res) => {
  // Destructure all possible query parameters
  const { startDate, endDate, username, region, title } = req.query;

  try {
    // Start building the query
    let query = `
      SELECT 
        u.name,
        u.number,
        u.region,
        u.title,
        DATE(a.check_in_time AT TIME ZONE 'Europe/Belgrade') as date,
        TO_CHAR(a.check_in_time AT TIME ZONE 'Europe/Belgrade', 'HH24:MI:SS') as check_in,
        TO_CHAR(a.check_out_time AT TIME ZONE 'Europe/Belgrade', 'HH24:MI:SS') as check_out,
        CASE 
          WHEN a.check_out_time IS NULL THEN 'Not Checked Out'
          ELSE TO_CHAR(a.check_out_time - a.check_in_time, 'HH24:MI')
        END as total_hours
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Dynamically add conditions for each filter if it exists
    if (username) {
      params.push(`%${username}%`);
      query += ` AND u.name ILIKE $${params.length}`;
    }
    if (startDate) {
      params.push(startDate);
      query += ` AND DATE(a.check_in_time AT TIME ZONE 'Europe/Belgrade') >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND DATE(a.check_in_time AT TIME ZONE 'Europe/Belgrade') <= $${params.length}`;
    }
    if (region) {
      params.push(region);
      query += ` AND u.region = $${params.length}`;
    }
    if (title) {
      params.push(title);
      query += ` AND u.title = $${params.length}`;
    }

    query += ` ORDER BY u.name, a.check_in_time`;

    const result = await promisePool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No attendance records found for the specified criteria" });
    }

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Define columns
    worksheet.columns = [
      { header: 'Employee Name', key: 'name', width: 20 },
      { header: 'Employee Number', key: 'number', width: 15 },
      { header: 'Region', key: 'region', width: 15 },
      { header: 'Title', key: 'title', width: 20 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Check In', key: 'check_in', width: 10 },
      { header: 'Check Out', key: 'check_out', width: 10 },
      { header: 'Total Hours', key: 'total_hours', width: 12 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Add data rows
    result.rows.forEach(row => {
      worksheet.addRow({
        name: row.name,
        number: row.number || 'N/A',
        region: row.region || 'N/A',
        title: row.title || 'N/A',
        date: row.date,
        check_in: row.check_in,
        check_out: row.check_out || 'Not Checked Out',
        total_hours: row.total_hours
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set response headers
    const filename = `attendance_report_${startDate || 'all'}_to_${endDate || 'all'}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer);

  } catch (error) {
    console.error("Error generating attendance report:", error);
    res.status(500).json({ message: "Error generating report" });
  }
};


export const generateVacationReport = async (req, res) => {
  // Destructure all possible query parameters
  const { status, username, region, title } = req.query;

  try {
    let query = `
      SELECT 
        u.name as employee_name,
        u.number as employee_number,
        u.region,
        u.title,
        v.start_date,
        v.end_date,
        v.end_date - v.start_date + 1 as days_requested,
        v.status,
        TO_CHAR(v.requested_at, 'YYYY-MM-DD HH24:MI') as requested_at,
        r.name as reviewed_by
      FROM vacations v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN users r ON v.reviewed_by = r.id
      WHERE 1=1
    `;
    const params = [];

    if (username) {
        params.push(`%${username}%`);
        query += ` AND u.name ILIKE $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND v.status = $${params.length}`;
    }
    if (region) {
      params.push(region);
      query += ` AND u.region = $${params.length}`;
    }
    if (title) {
      params.push(title);
      query += ` AND u.title = $${params.length}`;
    }


    query += ` ORDER BY v.requested_at DESC`;

    const result = await promisePool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No vacation requests found for the specified criteria" });
    }

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Vacation Report');

    // Define columns
    worksheet.columns = [
      { header: 'Employee Name', key: 'employee_name', width: 20 },
      { header: 'Employee Number', key: 'employee_number', width: 15 },
      { header: 'Region', key: 'region', width: 15 },
      { header: 'Title', key: 'title', width: 20 },
      { header: 'Start Date', key: 'start_date', width: 12 },
      { header: 'End Date', key: 'end_date', width: 12 },
      { header: 'Days Requested', key: 'days_requested', width: 15 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Requested At', key: 'requested_at', width: 18 },
      { header: 'Reviewed By', key: 'reviewed_by', width: 20 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Add data rows
result.rows.forEach(row => {
  const startDate = new Date(row.start_date);
  const endDate = new Date(row.end_date);
  
  startDate.setHours(startDate.getHours() + 24);
  endDate.setHours(endDate.getHours() + 24);

  const addedRow = worksheet.addRow({
    employee_name: row.employee_name,
    employee_number: row.employee_number || 'N/A',
    region: row.region || 'N/A',
    title: row.title || 'N/A',
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    days_requested: row.days_requested,
    status: row.status.charAt(0).toUpperCase() + row.status.slice(1),
    requested_at: row.requested_at,
    reviewed_by: row.reviewed_by || 'Pending'
  });
});


    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set response headers
    const filename = `vacation_report_${status || 'all'}_${Date.now()}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer);

  } catch (error) {
    console.error("Error generating vacation report:", error);
    res.status(500).json({ message: "Error generating report" });
  }
};