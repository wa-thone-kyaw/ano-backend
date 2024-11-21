const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const router = express.Router();
const { executeQuery } = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET; // Ensure your .env file has JWT_SECRET defined

// Sign-up Route (Create a new user)
router.post("/", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Check if the user already exists
    const existingUser = await executeQuery(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into the database with status as Inactive
    const query =
      "INSERT INTO users (name, email, password, status) VALUES (?, ?, ?, ?)";
    await executeQuery(query, [name, email, hashedPassword, "Inactive"]);

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Error during sign-up:", error);

    // Send detailed error message if in development mode, otherwise generic message
    if (process.env.NODE_ENV === "development") {
      res
        .status(500)
        .json({ error: `Failed to create user: ${error.message}` });
    } else {
      res.status(500).json({ error: "Failed to create user" });
    }
  }
});

module.exports = router;
