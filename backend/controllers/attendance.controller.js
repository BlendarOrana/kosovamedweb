import { promisePool } from "../lib/db.js";

const OFFICE_LOCATIONS = [
   { id: 1,  name: "HQ – Main Building",      lat: 42.65184182563937, lng: 21.169402496155314 },
   { id: 2,  name: "Qkmf Skenderaj",      lat: 42.74721521578018, lng: 20.78698461542366 },
   { id: 3,  name: "QMF- Qirez (Skenderaj)",lat: 42.71607260408312, lng: 20.89094466123742 },
   { id: 4,  name: "Qkmf kline",lat: 42.61939280000000, lng: 20.57123670000000 },
   { id: 5,  name: "QMF Sferk (Kline)",lat: 42.54123295748425, lng: 20.61030506475371 },
   { id: 6,  name: "Skenderaj",lat: 42.74458464467040,lng: 20.78550617809941 },
   { id: 7,  name: "QPS Kline",lat: 42.61772120949209, lng: 20.57092895353628 },
   { id: 8,  name: "(Dresnin) Kline",lat: 42.60491600721786, lng: 20.52061848529930 },
   { id: 9,  name: "(Jashanic) Kline",lat: 42.63538470000000, lng: 20.64100310000000 },
   { id: 10,  name: "Qmf Stanterg (Mitrovic)",lat: 42.94042186974297, lng: 20.92336652300105 },
   { id: 11,  name: "Bare Shal (Mitrovic)",lat: 42.95166185077396, lng: 20.96472409230651 },
   { id: 12,  name: "QMF Runik (Skenderaj)",lat: 42.79443314855924, lng: 20.69252167897621 },
   { id: 13,  name: "Mitrovice",lat: 42.91904066813984, lng: 20.89999031190001 },
   { id: 14,  name: "Qkmf Mitrovice",lat: 42.89083165278907, lng: 20.87344971041443 },
   { id: 15,  name: "Qkmf Kqiq Mitrovice",lat: 42.86139485637696, lng: 20.92503547644794 },
   { id: 16,  name: "Qkmf Frasher Mitrovice",lat: 42.86098612638327, lng: 20.88170997196001 },
   { id: 17,  name: "Qkmf Ura e gjakut Mitrovice",lat: 42.87082085032519, lng: 20.86700679877211 },
   { id: 18,  name: "Amf Fidanishte Mitrovice",lat: 42.88677100372704, lng: 20.85862498600552 },
   { id: 19,  name: "Qmf Koshtove",lat: 42.87479258111124, lng: 20.79601496118030 },
];

const BASE_RADIUS_M   = 20;   
const MAX_RADIUS_M    = 40;   
const LOCATION_TTL_MS = 20_000; 

function haversineMetres(lat1, lng1, lat2, lng2) {
  const R   = 6_371_000; 
  const toR = (deg) => (deg * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLng = toR(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestOffice(userLat, userLng) {
  let best = null;
  for (const office of OFFICE_LOCATIONS) {
    const dist = haversineMetres(userLat, userLng, office.lat, office.lng);
    if (!best || dist < best.distance) {
      best = { office, distance: dist };
    }
  }
  return best;
}

async function validateLocation(req) {
  const { lat, lng, accuracy, locationTimestamp } = req.body;

  if (lat == null || lng == null || accuracy == null) {
    return { ok: false, status: 400, message: "Location data is required." };
  }

  if (locationTimestamp) {
    const age = Date.now() - new Date(locationTimestamp).getTime();
    if (age > LOCATION_TTL_MS) {
      return { ok: false, status: 400, message: "Location data is too old." };
    }
  }

  if (accuracy > 50) {
    return { ok: false, status: 400, message: "GPS accuracy is too low." };
  }

  const maxRadius = Math.min(BASE_RADIUS_M + accuracy, MAX_RADIUS_M);
  const nearest   = nearestOffice(lat, lng);

  if (!nearest || nearest.distance > maxRadius) {
    const distText = nearest ? `${Math.round(nearest.distance)} m away` : "no offices found";
    return {
      ok: false,
      status: 403,
      message: `You are not within distance (${distText}). Required: ${Math.round(maxRadius)} m.`,
    };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Controller Actions
// ---------------------------------------------------------------------------

export const checkIn = async (req, res) => {
  const userId = req.user.id;

  // 1. Check location first
  const validation = await validateLocation(req).catch(() => ({ ok: false, status: 500, message: "Validation error" }));
  if (!validation.ok) return res.status(validation.status).json({ message: validation.message });

  // 2. Your original DB logic
  try {
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

  // 1. Check location first
  const validation = await validateLocation(req).catch(() => ({ ok: false, status: 500, message: "Validation error" }));
  if (!validation.ok) return res.status(validation.status).json({ message: validation.message });

  // 2. Your original DB logic
  try {
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

