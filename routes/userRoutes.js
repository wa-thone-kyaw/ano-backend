const express = require("express");
const router = express.Router();
const moment = require("moment-timezone");
const { executeQuery } = require("../config/db");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");

const upload = require("../config/multerConfig");
// Route to add a new user
router.post("/", async (req, res) => {
  const { name, email, role, status, promote } = req.body;
  try {
    const query = `INSERT INTO users (name, email, role, status, promote) VALUES (?, ?, ?, ?, ?)`;
    await executeQuery(query, [name, email, role, status, promote]);
    res.status(201).json({ message: "User added successfully" });
  } catch (error) {
    console.error("Error adding user:", error); // Log the error
    res.status(500).json({ error: "Failed to add user" });
  }
});

// Route to get all users
router.get("/", async (req, res) => {
  try {
    const query = "SELECT * FROM users";
    const users = await executeQuery(query);
    res.json(users);
  } catch (error) {
    console.error("Error retrieving users:", error); // Log the error
    res.status(500).json({ error: "Failed to retrieve users" });
  }
});

// Route to get a user by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  // Validate ID format
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  try {
    const query = "SELECT name, email, role FROM users WHERE id = ?";
    const user = await executeQuery(query, [id]);

    if (user.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user[0]); // Send the first user if found
  } catch (error) {
    console.error("Error fetching user by ID:", error); // Log the error
    res.status(500).json({ error: "Failed to retrieve user data" });
  }
});

// Route to update a user by ID
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, role, status, promote } = req.body;
  const lastLogin = moment().tz("Asia/Yangon").format("YYYY-MM-DD HH:mm:ss"); // Capture the current time

  // Validate ID format
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  try {
    const query = `UPDATE users SET name = ?, email = ?, role = ?, status = ?, promote = ?, last_login = ? WHERE id = ?`;
    await executeQuery(query, [
      name,
      email,
      role,
      status,
      promote,
      lastLogin,
      id,
    ]);

    res.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error); // Log the error
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Route to delete a user by ID
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  // Validate ID format
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  try {
    const query = `DELETE FROM users WHERE id = ?`;
    await executeQuery(query, [id]);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error); // Log the error
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Password Reset Route
router.put("/:id/reset-password", async (req, res) => {
  const { id } = req.params;

  // Validate ID format
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  try {
    // Generate a random password
    const randomPassword = crypto.randomBytes(4).toString("hex"); // Generates a random password
    const hashedPassword = await bcrypt.hash(randomPassword, 10); // Hash the random password
    console.log(`New password for user ${id}: ${randomPassword}`); // Log the new password for reference

    // Update user's password to the random password
    const updateQuery = "UPDATE users SET password = ? WHERE id = ?";
    await executeQuery(updateQuery, [hashedPassword, id]);

    // Send the generated password back in the response
    res.json({
      message: "Password reset successful. Here is the new password.",
      newPassword: randomPassword, // Include the new password in the response
    });
  } catch (error) {
    console.error("Error resetting password:", error); // Log the error
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// Route to change password
router.put("/:id/change-password", async (req, res) => {
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "Both old and new passwords are required" });
  }
  // Validate ID format
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  try {
    // Find the user by ID
    const query = "SELECT password FROM users WHERE id = ?";
    const user = await executeQuery(query, [id]);

    if (user.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Compare the old password with the hashed password in the database
    const isMatch = await bcrypt.compare(oldPassword, user[0].password);
    if (!isMatch) {
      return res.status(400).json({ error: "Old password is incorrect" });
    }

    // Hash the new password and update the user record
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const updateQuery = "UPDATE users SET password = ? WHERE id = ?";
    await executeQuery(updateQuery, [hashedNewPassword, id]);

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error); // Log the error
    res.status(500).json({ error: "Failed to change password" });
  }
});
// Route to get total user count
router.get("/count", async (req, res) => {
  try {
    const query = "SELECT COUNT(*) AS totalUsers FROM users";
    const result = await executeQuery(query);
    res.json({ totalUsers: result[0].totalUsers });
  } catch (error) {
    console.error("Error retrieving total users:", error);
    res.status(500).json({ error: "Failed to retrieve total user count" });
  }
});

module.exports = router;
