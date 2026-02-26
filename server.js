import express from "express";
import sqlite3 from "sqlite3";
import cors from "cors";
import validator from "validator";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ✅ IMPORTANT: enable verbose for better errors
const sqlite = sqlite3.verbose();

// ✅ Railway-safe DB path
const db = new sqlite.Database("./hrms.db", err => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Connected to SQLite database");
  }
});

// ================= DATABASE =================
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      employeeId TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      department TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employeeId TEXT,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY(employeeId) REFERENCES employees(employeeId)
    )
  `);
});

// ================= HEALTH CHECK (Railway) =================
app.get("/", (_, res) => {
  res.send("✅ HRMS Lite API is running");
});

// ================= EMPLOYEES API =================
app.get("/api/employees", (_, res) => {
  db.all("SELECT * FROM employees", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/employees", (req, res) => {
  const { employeeId, fullName, email, department } = req.body;

  if (!employeeId || !fullName || !email || !department) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  db.run(
    "INSERT INTO employees VALUES (?, ?, ?, ?)",
    [employeeId, fullName, email, department],
    err => {
      if (err) {
        return res.status(409).json({ error: "Employee already exists" });
      }
      res.status(201).json({ message: "Employee added" });
    }
  );
});

app.delete("/api/employees/:id", (req, res) => {
  db.run(
    "DELETE FROM employees WHERE employeeId = ?",
    [req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ error: "Employee not found" });

      res.json({ message: "Employee deleted" });
    }
  );
});

// ================= ATTENDANCE API =================
app.post("/api/attendance", (req, res) => {
  const { employeeId, date, status } = req.body;

  if (!employeeId || !date || !status) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.run(
    "INSERT INTO attendance (employeeId, date, status) VALUES (?, ?, ?)",
    [employeeId, date, status],
    err => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Attendance marked" });
    }
  );
});

app.get("/api/attendance", (req, res) => {
  const { date } = req.query;

  let query = `
    SELECT e.fullName, a.date, a.status
    FROM attendance a
    JOIN employees e ON e.employeeId = a.employeeId
  `;
  const params = [];

  if (date) {
    query += " WHERE a.date = ?";
    params.push(date);
  }

  query += " ORDER BY a.date DESC";

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ================= ATTENDANCE SUMMARY =================
app.get("/api/attendance-summary", (_, res) => {
  db.all(
    `
    SELECT e.fullName,
           COUNT(a.id) AS presentDays
    FROM employees e
    LEFT JOIN attendance a
      ON e.employeeId = a.employeeId
      AND a.status = 'Present'
    GROUP BY e.employeeId
    `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ================= DASHBOARD =================
app.get("/api/dashboard", (_, res) => {
  db.get(
    "SELECT COUNT(*) as totalEmployees FROM employees",
    [],
    (err, emp) => {
      if (err) return res.status(500).json({ error: err.message });

      db.get(
        "SELECT COUNT(*) as totalPresent FROM attendance WHERE status = 'Present'",
        [],
        (err2, att) => {
          if (err2) return res.status(500).json({ error: err2.message });

          res.json({
            totalEmployees: emp.totalEmployees,
            totalPresent: att.totalPresent
          });
        }
      );
    }
  );
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 HRMS Lite running on port ${PORT}`);
});