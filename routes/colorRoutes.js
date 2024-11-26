// module.exports = router;
const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");

// Fetch all colors
router.get("/", async (req, res) => {
  try {
    const results = await executeQuery("SELECT * FROM color ORDER BY id DESC");
    res.json(results);
  } catch (err) {
    console.error("Error fetching colors:", err);
    res.status(500).json({ error: "Failed to fetch colors" });
  }
});

// Create a new color
router.post("/", async (req, res) => {
  const { color_name, color_code } = req.body;
  try {
    await executeQuery(
      "INSERT INTO color (color_name , color_code) VALUES (?, ?)",
      [color_name, color_code]
    );
    res.status(201).json({ message: "Color created successfully" });
  } catch (err) {
    console.error("Error creating color:", err);
    res.status(500).json({ error: "Failed to create color" });
  }
});

// Update an existing color
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { color_name, color_code } = req.body;
  try {
    await executeQuery(
      "UPDATE color SET color_name = ? , color_code= ?  WHERE id = ?",
      [color_name, color_code, id]
    );
    res.json({ message: "Color updated successfully" });
  } catch (err) {
    console.error("Error updating color:", err);
    res.status(500).json({ error: "Failed to update color" });
  }
});

// Delete a color
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Check if the color is used in any product
    const productCheck = await executeQuery(
      "SELECT COUNT(*) as count FROM product WHERE color_id = ?",
      [id]
    );

    if (productCheck[0].count > 0) {
      return res.status(400).json({
        error: "Color cannot be deleted; it is in use by one or more products.",
      });
    }

    await executeQuery("DELETE FROM color WHERE id = ?", [id]);
    res.json({ message: "Color deleted successfully" });
  } catch (err) {
    console.error("Error deleting color:", err);
    res.status(500).json({ error: "Failed to delete color" });
  }
});

module.exports = router;
