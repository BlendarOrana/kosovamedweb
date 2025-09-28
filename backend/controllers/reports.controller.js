import ExcelJS from 'exceljs';
import { promisePool } from "../lib/db.js";

// Generate attendance report as Excel
export const generateAttendanceReport = async (req, res) => {
  const { startDate, endDate, username } = req.query;

  try {
    // Build query for attendance data
    let query = `
      SELECT 
        u.name,
        u.number,
        DATE(a.check_in_time) as date,
        TO_CHAR(a.check_in_time, 'HH24:MI:SS') as check_in,
        TO_CHAR(a.check_out_time, 'HH24:MI:SS') as check_out,
        CASE 
          WHEN a.check_out_time IS NULL THEN 'Not Checked Out'
          ELSE TO_CHAR(a.check_out_time - a.check_in_time, 'HH24:MI')
        END as total_hours,
        CASE 
          WHEN EXTRACT(HOUR FROM a.check_in_time) > 9 THEN 'Late'
          ELSE 'On Time'
        END as status
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (username) {
      params.push(username);
      query += ` AND u.username = $${params.length}`;
    }
    if (startDate) {
      params.push(startDate);
      query += ` AND DATE(a.check_in_time) >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND DATE(a.check_in_time) <= $${params.length}`;
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
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Check In', key: 'check_in', width: 10 },
      { header: 'Check Out', key: 'check_out', width: 10 },
      { header: 'Total Hours', key: 'total_hours', width: 12 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Notes', key: 'notes', width: 30 }
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
      const addedRow = worksheet.addRow({
        name: row.name,
        number: row.number || 'N/A',
        date: row.date,
        check_in: row.check_in,
        check_out: row.check_out || 'Not Checked Out',
        total_hours: row.total_hours,
        status: row.status,
        notes: row.notes || ''
      });

      // Color code status
      if (row.status === 'Late') {
        addedRow.getCell('status').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC0CB' }
        };
      } else if (row.status === 'On Time') {
        addedRow.getCell('status').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' }
        };
      }
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

// Generate vacation report as Excel
export const generateVacationReport = async (req, res) => {
  const { status, username } = req.query;

  try {
    let query = `
      SELECT 
        u.name as employee_name,
        u.number as employee_number,
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
      params.push(username);
      query += ` AND u.username = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND v.status = $${params.length}`;
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
      const addedRow = worksheet.addRow({
        employee_name: row.employee_name,
        employee_number: row.employee_number || 'N/A',
        start_date: row.start_date,
        end_date: row.end_date,
        days_requested: row.days_requested,
        status: row.status.charAt(0).toUpperCase() + row.status.slice(1),
        requested_at: row.requested_at,
        reviewed_by: row.reviewed_by || 'Pending'
      });

      // Color code status
      if (row.status === 'approved') {
        addedRow.getCell('status').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' }
        };
      } else if (row.status === 'rejected') {
        addedRow.getCell('status').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC0CB' }
        };
      } else if (row.status === 'pending') {
        addedRow.getCell('status').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF99' }
        };
      }
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

// Generate summary report
export const generateSummaryReport = async (req, res) => {
  const { startDate, endDate, username } = req.query;

  try {
    // Get attendance summary
    let attendanceQuery = `
      SELECT 
        u.name,
        u.number,
        COUNT(a.id) as total_days,
        COUNT(CASE WHEN EXTRACT(HOUR FROM a.check_in_time) <= 9 THEN 1 END) as on_time_days,
        COUNT(CASE WHEN EXTRACT(HOUR FROM a.check_in_time) > 9 THEN 1 END) as late_days,
        COUNT(CASE WHEN a.check_out_time IS NULL THEN 1 END) as incomplete_days,
        ROUND(AVG(EXTRACT(EPOCH FROM (a.check_out_time - a.check_in_time))/3600)::numeric, 2) as avg_hours
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id
      WHERE 1=1
    `;
    const params = [];

    if (username) {
      params.push(username);
      attendanceQuery += ` AND u.username = $${params.length}`;
    }
    if (startDate) {
      params.push(startDate);
      attendanceQuery += ` AND DATE(a.check_in_time) >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      attendanceQuery += ` AND DATE(a.check_in_time) <= $${params.length}`;
    }

    attendanceQuery += ` GROUP BY u.id, u.name, u.number ORDER BY u.name`;

    const attendanceResult = await promisePool.query(attendanceQuery, params);

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Summary Report');

    // Define columns
    worksheet.columns = [
      { header: 'Employee Name', key: 'name', width: 20 },
      { header: 'Employee Number', key: 'number', width: 15 },
      { header: 'Total Days', key: 'total_days', width: 12 },
      { header: 'On Time Days', key: 'on_time_days', width: 15 },
      { header: 'Late Days', key: 'late_days', width: 12 },
      { header: 'Incomplete Days', key: 'incomplete_days', width: 18 },
      { header: 'Average Hours', key: 'avg_hours', width: 15 },
      { header: 'Attendance Rate', key: 'attendance_rate', width: 18 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Add data rows
    attendanceResult.rows.forEach(row => {
      const attendanceRate = row.total_days > 0 ? Math.round((row.on_time_days / row.total_days) * 100) : 0;
      
      const addedRow = worksheet.addRow({
        name: row.name,
        number: row.number || 'N/A',
        total_days: row.total_days,
        on_time_days: row.on_time_days,
        late_days: row.late_days,
        incomplete_days: row.incomplete_days,
        avg_hours: row.avg_hours || 0,
        attendance_rate: `${attendanceRate}%`
      });

      // Color code attendance rate
      if (attendanceRate >= 90) {
        addedRow.getCell('attendance_rate').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' }
        };
      } else if (attendanceRate >= 70) {
        addedRow.getCell('attendance_rate').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF99' }
        };
      } else {
        addedRow.getCell('attendance_rate').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC0CB' }
        };
      }
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set response headers
    const filename = `summary_report_${startDate || 'all'}_to_${endDate || 'all'}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer);

  } catch (error) {
    console.error("Error generating summary report:", error);
    res.status(500).json({ message: "Error generating summary report" });
  }
};