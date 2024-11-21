const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const router = express.Router();
const { executeQuery } = require("../config/db");
const moment = require("moment-timezone");

const JWT_SECRET = process.env.JWT_SECRET; // Ensure this is defined in your .env file

// Login Route
router.post("/", async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log("Incoming login request:", { email });
    const query = `SELECT * FROM users WHERE email = ?`;
    const users = await executeQuery(query, [email]);

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = users[0];

    if (user.status === "Inactive") {
      return res.status(403).json({ message: "Account is inactive" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Update last_login on successful login
    const lastLogin = moment().tz("Asia/Yangon").format("YYYY-MM-DD HH:mm:ss");
    await executeQuery(`UPDATE users SET last_login = ? WHERE id = ?`, [
      lastLogin,
      user.id,
    ]);

    // Generate the token
    const token = jwt.sign(
      { userId: String(user.id), role: user.role }, // Ensure ID is a string
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Send response
    res.json({
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        last_login: lastLogin,
      },
      message: "Login successful",
    });
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ error: "Login failed", details: error.message });
  }
});

module.exports = router;
