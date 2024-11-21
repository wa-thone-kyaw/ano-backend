const mysql = require("mysql");
require("dotenv").config();

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    process.exit(1); // Exit the process if connection fails
  }
  console.log("Connected to database.");
});

// Helper function to execute a query
const executeQuery = (query, params) => {
  return new Promise((resolve, reject) => {
    db.query(query, params, (err, results) => {
      if (err) reject(err);
      resolve(results);
    });
  });
};

module.exports = { executeQuery };
