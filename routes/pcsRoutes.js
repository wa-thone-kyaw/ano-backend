const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");

// Fetch all PCS per box
router.get("/", async (req, res) => {
  try {
    const results = await executeQuery(
      "SELECT * FROM pcs_per_box ORDER BY id DESC"
    );
    res.json(results);
  } catch (err) {
    console.error("Error fetching PCS per box:", err);
    res.status(500).json({ error: "Failed to fetch PCS per box" });
  }
});

// Create a new PCS per box
router.post("/", async (req, res) => {
  const { pcs_per_box } = req.body;
  try {
    const result = await executeQuery(
      "INSERT INTO pcs_per_box (pcs_per_box) VALUES (?)",
      [pcs_per_box]
    );
    res.status(201).json({ id: result.insertId, pcs_per_box });
  } catch (err) {
    console.error("Error creating PCS per box:", err);
    res.status(500).json({ error: "Failed to create PCS per box" });
  }
});

// Update an existing PCS per box
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { pcs_per_box } = req.body;
  try {
    await executeQuery("UPDATE pcs_per_box SET pcs_per_box = ? WHERE id = ?", [
      pcs_per_box,
      id,
    ]);
    res.json({ message: "PCS per box updated successfully" });
  } catch (err) {
    console.error("Error updating PCS per box:", err);
    res.status(500).json({ error: "Failed to update PCS per box" });
  }
});

// Delete a PCS per box
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await executeQuery("DELETE FROM pcs_per_box WHERE id = ?", [id]);
    res.json({ message: "PCS per box deleted successfully" });
  } catch (err) {
    console.error("Error deleting PCS per box:", err);
    res.status(500).json({ error: "Failed to delete PCS per box" });
  }
});

module.exports = router;
