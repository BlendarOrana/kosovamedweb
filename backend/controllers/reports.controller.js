import ExcelJS from 'exceljs';
import { promisePool } from "../lib/db.js";
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const bgImagePath = path.join(__dirname, '..', 'assets', 'bg.jpg');


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
        u.shift,
        DATE(a.check_in_time AT TIME ZONE 'Europe/Belgrade') as date,
        TO_CHAR(a.check_in_time AT TIME ZONE 'Europe/Belgrade', 'HH24:MI:SS') as check_in,
        TO_CHAR(a.check_out_time AT TIME ZONE 'Europe/Belgrade', 'HH24:MI:SS') as check_out
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

    // Define columns - removed Total Hours column
    worksheet.columns = [
      { header: 'Employee Name', key: 'name', width: 20 },
      { header: 'Employee Number', key: 'number', width: 15 },
      { header: 'Region', key: 'region', width: 15 },
      { header: 'Title', key: 'title', width: 20 },
      { header: 'Shift', key: 'shift', width: 12 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Check In', key: 'check_in', width: 10 },
      { header: 'Check Out', key: 'check_out', width: 10 }
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
      // Convert shift number to text
      let shiftText = 'N/A';
      if (row.shift === 1) {
        shiftText = 'Paradite';
      } else if (row.shift === 2) {
        shiftText = 'Pasdite';
      }

      worksheet.addRow({
        name: row.name,
        number: row.number || 'N/A',
        region: row.region || 'N/A',
        title: row.title || 'N/A',
        shift: shiftText,
        date: row.date,
        check_in: row.check_in,
        check_out: row.check_out || 'Not Checked Out'
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


// Kosovo Public Holidays for 2025
const kosovoHolidays2025 = [
  '2025-01-01', // New Year's Day
  '2025-01-02', // New Year's Holiday (Second Day)
  '2025-01-07', // Orthodox Christmas
  '2025-02-17', // Independence Day
  '2025-03-31', // Eid al-Fitr (observed)
  '2025-04-09', // Constitution Day
  '2025-04-21', // Orthodox Easter (observed)
  '2025-04-21', // Catholic Easter (observed)
  '2025-05-01', // International Workers' Day
  '2025-05-09', // Europe Day
  '2025-06-06', // Eid al-Adha
  '2025-12-25', // Catholic Christmas
];

// Helper function to check if a date is a weekend
const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
};

// Helper function to check if a date is a holiday
const isHoliday = (date) => {
  const dateString = date.toISOString().split('T')[0];
  return kosovoHolidays2025.includes(dateString);
};

// Calculate business days between two dates (excluding weekends and holidays)
const calculateBusinessDays = (startDate, endDate) => {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    if (!isWeekend(current) && !isHoliday(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
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
        v.status,
        TO_CHAR(v.requested_at, 'YYYY-MM-DD HH24:MI') as requested_at,
        r.name as reviewed_by,
        rep.name as replacement_user_name,
        v.replacement_status
      FROM vacations v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN users r ON v.reviewed_by = r.id
      LEFT JOIN users rep ON v.replacement_user_id = rep.id
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
      { header: 'Business Days', key: 'business_days', width: 15 },
      { header: 'Status', key: 'status', width: 25 },
      { header: 'Replacement User', key: 'replacement_user_name', width: 20 },
      { header: 'Replacement Status', key: 'replacement_status', width: 20 },
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

    // Helper function to format status for display
    const formatStatus = (status) => {
      if (!status) return 'N/A';
      return status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    // Add data rows
    result.rows.forEach(row => {
      const startDate = new Date(row.start_date);
      const endDate = new Date(row.end_date);
      
      startDate.setHours(startDate.getHours() + 24);
      endDate.setHours(endDate.getHours() + 24);

      // Calculate business days (excluding weekends and holidays)
      const businessDays = calculateBusinessDays(startDate, endDate);

      const addedRow = worksheet.addRow({
        employee_name: row.employee_name,
        employee_number: row.employee_number || 'N/A',
        region: row.region || 'N/A',
        title: row.title || 'N/A',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        business_days: businessDays,
        status: formatStatus(row.status),
        replacement_user_name: row.replacement_user_name || 'N/A',
        replacement_status: formatStatus(row.replacement_status),
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

// Export helper functions for use in other parts of your application
export { isWeekend, isHoliday, calculateBusinessDays, kosovoHolidays2025 };

export const generateContractTerminationPDF = async (req, res) => {
  const { userId } = req.query;

  try {
    // Fetch user data
    const query = `
      SELECT 
        name,
        address,
        region,
        contract_start_date
      FROM users
      WHERE id = $1
    `;
    
    const result = await promisePool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];
    const actualDate = new Date().toLocaleDateString('sq-AL');

    // Create PDF document with A4 size (595.28 x 841.89 points)
    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 50 
    });

    // Set response headers
    const filename = `contract_termination_${user.name}_${Date.now()}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');

    // Pipe PDF to response
    doc.pipe(res);

    // Add background image
    try {
  doc.image(bgImagePath, 0, 0, {
        width: 595.28,  // A4 width in points
        height: 841.89  // A4 height in points
      });
    } catch (imgError) {
      console.warn('Background image not found, continuing without it:', imgError);
    }

    // Reset position to top after image
    doc.x = 50;
    doc.y = 150;

    // Add content on top of background
    doc.fontSize(12);
    doc.text(
      `Në bazë të nenit 69 të Ligjit Nr. 03/L-212 të Punës në Kosovë, Statutit të Shoqërisë KOSOVAMED Healthcare SHPK dhe bazuar në Njoftimin e të Punësuarit për Ndërperje të Kontratës së Punës, Drejtori i Përgjithshëm i KOSOVAMED Healthcare SHPK, më datën ${actualDate}, merr këtë:`,
      { align: 'justify' }
    );

    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text('VENDIM', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Mbi Ndërprerjen e Kontratës se Punës', { align: 'center' });
    doc.moveDown();

    doc.text(
      `I. Ndërpritet Kontrata e Punës, ndërmjet ${user.name} nga ${user.address || 'N/A'} dhe Punëdhënësit KOSOVAMED Healthcare SHPK.`,
      { align: 'justify' }
    );

    doc.moveDown();
    doc.text(
      `II. Ky Vendim hynë në fuqi më datën ${actualDate}, meqenëse i Punësuari ka njoftuar për ndërprerjen e Kontratës së Punës me efekt të menjëhershëm.`,
      { align: 'justify' }
    );

    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text('ARSYETIM', { align: 'left' });
    doc.fontSize(12).font('Helvetica').moveDown();

    const contractStartDate = user.contract_start_date 
      ? new Date(user.contract_start_date).toLocaleDateString('sq-AL')
      : 'N/A';

    doc.text(
      `I punësuari ka Kontratë të Punës në periudhë të caktuar dhe i sistemuar në vendin e punës në Administratë në Operatorin Ekonomik "KosovaMed Healthchare" gjegjësishtë në Kuvendin Komunal të ${user.region || 'N/A'}, sipas Kontratës së Punës te datës ${contractStartDate}`,
      { align: 'justify' }
    );

    doc.moveDown();
    doc.text(
      `Meqenëse i Punësuari ka dorëzuar tek Punëdhënësi Njoftimin për Ndërprerjen e Kontratës së Punës me efekt të menjëhershëm, gjithashtu Punëdhënësi këtë Ndërprerje të Kontratës së Punës nuk e ka kundërshtuar, duke e pranuar dhe duke e respektuar vendimin e Punëmarrësit. Bazuar në këto, konsiderohet që janë përmbushur kushtet e përcaktuara me Nenin 69 të Ligjit Nr. 03/L-212 të Punës dhe rrjedhimisht asnjëra palë nuk ka ndonjë pretendim ndaj palës tjetër.`,
      { align: 'justify' }
    );

    doc.moveDown();
    doc.text(
      `Udhëzim juridik: Kundër këtij Vendimi pala e pakënaqur ka të drejtë të paraqes ankesë në afat prej (8) tetë ditësh, duke llogaritur nga dita e pranimit. në Komisionin e formuar nga ana Punëdhënësit.`,
      { align: 'justify' }
    );

    doc.moveDown(2);
    doc.text('Art Ramadani', { continued: false });
    doc.text('Burimet Njerëzore');

    doc.moveDown();
    doc.text(`_______________                                                                  Prishtinë, më datë ${actualDate}`);

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error("Error generating contract termination PDF:", error);
    res.status(500).json({ message: "Error generating PDF" });
  }
};




export const generateEmploymentCertificatePDF = async (req, res) => {
  const { userId } = req.query;

  try {
    // Fetch user data
    const query = `
      SELECT 
        name,
        region,
        id_card_number,
        title,
        contract_start_date,
        contract_end_date
      FROM users
      WHERE id = $1
    `;
    
    const result = await promisePool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];
    const actualDate = new Date().toLocaleDateString('sq-AL');

    // Format dates
    const contractStartDate = user.contract_start_date 
      ? new Date(user.contract_start_date).toLocaleDateString('sq-AL')
      : 'N/A';
    
    const contractEndDate = user.contract_end_date 
      ? new Date(user.contract_end_date).toLocaleDateString('sq-AL')
      : actualDate;

    // Create PDF document with A4 size
    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 50 
    });

    // Set response headers
    const filename = `employment_certificate_${user.name}_${Date.now()}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');

    // Pipe PDF to response
    doc.pipe(res);

    // Add background image
    try {
  doc.image(bgImagePath, 0, 0, {
        width: 595.28,  // A4 width in points
        height: 841.89  // A4 height in points
      });
    } catch (imgError) {
      console.warn('Background image not found, continuing without it:', imgError);
    }

    doc.y = 150
    // Add content on top of background
    doc.fontSize(12);
    doc.text(
      'OPERATORI EKONOMIK KOSOVAMED HEALTHCARE sh.p.k, me seli në Prishtinë lëshon këtë:',
      { align: 'justify' }
    );

    doc.moveDown(2);
    doc.fontSize(14).font('Helvetica-Bold').text('V E R T E T I M', { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(12).font('Helvetica');
    doc.text(
      `Me të cilën vërtetojmë se ${user.name} nga ${user.region || 'N/A'}, me numër personal ${user.id_card_number || 'N/A'} është në marrdhënje pune në KosovaMed Healthcare, në vendin e punës "${user.title || 'N/A'}" në Operatorin Ekonomik KosovaMed Healthcare me seli në Prishtinë gjegjësisht në Qendrën Kryesore të Mjekësisë Familjare – ${user.region || 'N/A'} nga data ${contractStartDate} me kohë të caktuar deri më ${contractEndDate}`,
      { align: 'justify' }
    );

    doc.moveDown();
    doc.text(
      `Vërtetimi i lëshohet me kërkesën e saj dhe i nevoitet si dëshmi e përvojes së punës si dhe që është e punësuar në Operatorin Ekonomik KosovaMed Healthcare gjegjësishtë në Qendrën Kryesore të Mjekësisë Familjare – ${user.region || 'N/A'}`,
      { align: 'justify' }
    );

    doc.moveDown(3);
    doc.text(`Prishtinë ${actualDate}`, { continued: true });
    doc.text('KosovaMed Healthcare Sh.p.k', { align: 'right' });
    
    doc.moveDown();
    doc.text('', { continued: false });
    doc.text('___________________', { align: 'right' });
    doc.text('Administrata', { align: 'right' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error("Error generating employment certificate PDF:", error);
    res.status(500).json({ message: "Error generating PDF" });
  }
};