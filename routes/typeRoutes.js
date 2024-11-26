const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");

// Fetch all types
router.get("/", async (req, res) => {
  try {
    const results = await executeQuery("SELECT * FROM type  ORDER BY id DESC");
    res.json(results);
  } catch (err) {
    console.error("Error fetching types:", err);
    res.status(500).json({ error: "Failed to fetch types" });
  }
});

// Create a new type
router.post("/", async (req, res) => {
  const { type_name } = req.body;
  try {
    await executeQuery("INSERT INTO type (type_name) VALUES (?)", [type_name]);
    res.status(201).json({ message: "Type created successfully" });
  } catch (err) {
    console.error("Error creating type:", err);
    res.status(500).json({ error: "Failed to create type" });
  }
});

// Update an existing type
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { type_name } = req.body;
  try {
    await executeQuery("UPDATE type SET type_name = ? WHERE id = ?", [
      type_name,
      id,
    ]);
    res.json({ message: "Type updated successfully" });
  } catch (err) {
    console.error("Error updating type:", err);
    res.status(500).json({ error: "Failed to update type" });
  }
});

// Delete a type
// Delete a type
// Delete a type
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Check if the type is associated with any products
    const [count] = await executeQuery(
      "SELECT COUNT(*) as count FROM product WHERE type_id = ?",
      [id]
    );

    // Ensure count is checked properly
    if (count.count > 0) {
      return res.status(400).json({
        error:
          "Cannot delete this type because it is associated with one or more products.",
      });
    }

    await executeQuery("DELETE FROM type WHERE id = ?", [id]);
    res.json({ message: "Type deleted successfully" });
  } catch (err) {
    console.error("Error deleting type:", err);
    res.status(500).json({ error: "Failed to delete type" });
  }
});

module.exports = router;
