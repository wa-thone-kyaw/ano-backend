const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");

// Fetch all warehouses
router.get("/", async (req, res) => {
  try {
    const results = await executeQuery(
      "SELECT * FROM warehouse ORDER BY id DESC"
    );
    res.json(results);
  } catch (err) {
    console.error("Error fetching warehouses:", err);
    res.status(500).json({ error: "Failed to fetch warehouses" });
  }
});

// Create a new warehouse
router.post("/", async (req, res) => {
  const { warehouse_name, warehouse_location } = req.body;
  try {
    const result = await executeQuery(
      "INSERT INTO warehouse (warehouse_name, warehouse_location) VALUES (?, ?)",
      [warehouse_name, warehouse_location]
    );
    const newWarehouse = {
      id: result.insertId,
      warehouse_name,
      warehouse_location,
    };
    res.status(201).json(newWarehouse);
  } catch (err) {
    console.error("Error creating warehouse:", err);
    res.status(500).json({ error: "Failed to create warehouse" });
  }
});

// Update an existing warehouse
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { warehouse_name, warehouse_location } = req.body;
  try {
    await executeQuery(
      "UPDATE warehouse SET warehouse_name = ?, warehouse_location = ? WHERE id = ?",
      [warehouse_name, warehouse_location, id]
    );
    res.json({ id, warehouse_name, warehouse_location });
  } catch (err) {
    console.error("Error updating warehouse:", err);
    res.status(500).json({ error: "Failed to update warehouse" });
  }
});

// Delete a warehouse
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const inventoryCheck = await executeQuery(
      "SELECT COUNT(*) as count FROM inventory WHERE warehouse_id = ?",
      [id]
    );

    if (inventoryCheck[0].count > 0) {
      return res.status(400).json({
        error:
          "Warehouse cannot be deleted; it is in use by one or more inventory items.",
      });
    }

    await executeQuery("DELETE FROM warehouse WHERE id = ?", [id]);
    res.json({ message: "Warehouse deleted successfully" });
  } catch (err) {
    console.error("Error deleting warehouse:", err);
    res.status(500).json({ error: "Failed to delete warehouse" });
  }
});

module.exports = router;
