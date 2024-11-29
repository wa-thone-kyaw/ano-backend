const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");
const dayjs = require("dayjs");
// Fetch all raw materials
router.get("/", async (req, res) => {
  try {
    const results = await executeQuery("SELECT * FROM raw_material");
    res.json(
      results.map((material) => ({
        ...material,
        localOrForeign: material.source, // Map 'source' column to 'localOrForeign' field
      }))
    );
  } catch (err) {
    console.error("Error fetching raw materials:", err);
    res.status(500).json({ error: "Failed to fetch raw materials" });
  }
});

// Create a new raw material
// rawMaterialRoutes.js
// POST route (create new material)
router.post("/", async (req, res) => {
  const {
    material_name,
    localOrForeign,
    import_date, // Ensure the format is 'YYYY-MM-DD'
    quantity,
    importer,
    unit,
  } = req.body;

  const formattedImportDate = import_date
    ? dayjs(import_date).format("YYYY-MM-DD") // Ensure correct format
    : null;

  try {
    await executeQuery(
      "INSERT INTO raw_material (material_name, source, import_date, quantity, importer, unit) VALUES (?, ?, ?, ?, ?, ?)",
      [
        material_name,
        localOrForeign,
        formattedImportDate,
        quantity,
        importer,
        unit,
      ]
    );
    res.status(201).json({ message: "Raw material created successfully" });
  } catch (err) {
    console.error("Error creating raw material:", err);
    res.status(500).json({ error: "Failed to create raw material" });
  }
});

// Fetch raw material by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await executeQuery(
      "SELECT * FROM raw_material WHERE id = ?",
      [id]
    );
    if (result.length > 0) {
      res.json(result[0]);
    } else {
      res.status(404).json({ error: "Raw material not found" });
    }
  } catch (err) {
    console.error("Error fetching raw material:", err);
    res.status(500).json({ error: "Failed to fetch raw material" });
  }
});

// Update raw material
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    material_name,
    localOrForeign,
    import_date,
    quantity,
    importer,
    unit,
  } = req.body;
  const formattedImportDate = import_date
    ? dayjs(import_date).format("YYYY-MM-DD")
    : null;

  try {
    await executeQuery(
      "UPDATE raw_material SET material_name = ?, source = ?, import_date = ?, quantity = ?, importer = ?, unit = ? WHERE id = ?",
      [
        material_name,
        localOrForeign,
        formattedImportDate,
        quantity,
        importer,
        unit,
        id,
      ]
    );
    res.json({ message: "Raw material updated successfully" });
  } catch (err) {
    console.error("Error updating raw material:", err);
    res.status(500).json({ error: "Failed to update raw material" });
  }
});

// Delete raw material
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await executeQuery("DELETE FROM raw_material WHERE id = ?", [id]);
    res.json({ message: "Raw material deleted successfully" });
  } catch (err) {
    console.error("Error deleting raw material:", err);
    res.status(500).json({ error: "Failed to delete raw material" });
  }
});

module.exports = router;

// Update and Delete routes would need similar updates to handle the new fields.
