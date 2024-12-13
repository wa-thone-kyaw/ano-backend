const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");
const dayjs = require("dayjs");

// Fetch all raw material usages
router.get("/", async (req, res) => {
  try {
    const results = await executeQuery(`
      SELECT u.id, u.raw_material_id, r.material_name, r.unit, 
             u.used_quantity, u.usage_date, u.purpose 
      FROM raw_material_usage u
      INNER JOIN raw_material r ON u.raw_material_id = r.id
    `);
    res.json(results);
  } catch (err) {
    console.error("Error fetching raw material usages:", err);
    res.status(500).json({ error: "Failed to fetch raw material usages" });
  }
});

// Create a new raw material usage and reduce raw material quantity
router.post("/", async (req, res) => {
  const { raw_material_id, used_quantity, usage_date, purpose } = req.body;

  if (!raw_material_id || !used_quantity || !usage_date) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const formattedUsageDate = dayjs(usage_date).format("YYYY-MM-DD");

  try {
    // Start a transaction
    await executeQuery("START TRANSACTION");

    // Insert usage record
    await executeQuery(
      `INSERT INTO raw_material_usage (raw_material_id, used_quantity, usage_date, purpose) 
       VALUES (?, ?, ?, ?)`,
      [raw_material_id, used_quantity, formattedUsageDate, purpose]
    );

    // Update raw material quantity
    const updateResult = await executeQuery(
      `UPDATE raw_material 
       SET quantity = quantity - ? 
       WHERE id = ? AND quantity >= ?`,
      [used_quantity, raw_material_id, used_quantity]
    );

    if (updateResult.affectedRows === 0) {
      // Rollback if insufficient quantity
      await executeQuery("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Insufficient raw material quantity" });
    }

    // Commit transaction
    await executeQuery("COMMIT");
    res
      .status(201)
      .json({ message: "Raw material usage recorded successfully" });
  } catch (err) {
    console.error("Error creating raw material usage:", err);
    await executeQuery("ROLLBACK");
    res.status(500).json({ error: "Failed to record raw material usage" });
  }
});

// Delete a raw material usage and restore quantity
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Start a transaction
    await executeQuery("START TRANSACTION");

    // Get the usage record
    const usage = await executeQuery(
      "SELECT raw_material_id, used_quantity FROM raw_material_usage WHERE id = ?",
      [id]
    );

    if (usage.length === 0) {
      return res.status(404).json({ error: "Usage record not found" });
    }

    const { raw_material_id, used_quantity } = usage[0];

    // Delete usage record
    await executeQuery("DELETE FROM raw_material_usage WHERE id = ?", [id]);

    // Restore raw material quantity
    await executeQuery(
      "UPDATE raw_material SET quantity = quantity + ? WHERE id = ?",
      [used_quantity, raw_material_id]
    );

    // Commit transaction
    await executeQuery("COMMIT");
    res.json({ message: "Usage record deleted and quantity restored" });
  } catch (err) {
    console.error("Error deleting usage record:", err);
    await executeQuery("ROLLBACK");
    res.status(500).json({ error: "Failed to delete usage record" });
  }
});
// Edit a raw material usage
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { raw_material_id, used_quantity, usage_date, purpose } = req.body;

  if (!raw_material_id || !used_quantity || !usage_date) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const formattedUsageDate = dayjs(usage_date).format("YYYY-MM-DD");

  try {
    // Start a transaction
    await executeQuery("START TRANSACTION");

    // Get existing record
    const existingRecord = await executeQuery(
      "SELECT raw_material_id, used_quantity FROM raw_material_usage WHERE id = ?",
      [id]
    );

    if (existingRecord.length === 0) {
      return res.status(404).json({ error: "Usage record not found" });
    }

    const { raw_material_id: oldMaterialId, used_quantity: oldQuantity } =
      existingRecord[0];

    // Restore the old quantity
    await executeQuery(
      "UPDATE raw_material SET quantity = quantity + ? WHERE id = ?",
      [oldQuantity, oldMaterialId]
    );

    // Update the record
    await executeQuery(
      `UPDATE raw_material_usage 
       SET raw_material_id = ?, used_quantity = ?, usage_date = ?, purpose = ? 
       WHERE id = ?`,
      [raw_material_id, used_quantity, formattedUsageDate, purpose, id]
    );

    // Deduct the new quantity
    const updateResult = await executeQuery(
      "UPDATE raw_material SET quantity = quantity - ? WHERE id = ? AND quantity >= ?",
      [used_quantity, raw_material_id, used_quantity]
    );

    if (updateResult.affectedRows === 0) {
      // Rollback if insufficient quantity
      await executeQuery("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Insufficient raw material quantity" });
    }

    // Commit transaction
    await executeQuery("COMMIT");
    res.json({ message: "Usage record updated successfully" });
  } catch (err) {
    console.error("Error updating usage record:", err);
    await executeQuery("ROLLBACK");
    res.status(500).json({ error: "Failed to update usage record" });
  }
});

//for useage report
// Fetch detailed usage record for raw material
// Fetch detailed usage record for raw material
router.get("/usage-details/:rawMaterialId", async (req, res) => {
  const { rawMaterialId } = req.params;
  try {
    const usageDetails = await executeQuery(
      `SELECT * FROM raw_material_usage WHERE raw_material_id = ? ORDER BY usage_date DESC`,
      [rawMaterialId]
    );
    const rawMaterial = await executeQuery(
      `SELECT material_name, quantity FROM raw_material WHERE id = ?`,
      [rawMaterialId]
    );
    if (rawMaterial.length === 0) {
      return res.status(404).json({ error: "Raw material not found" });
    }
    const remainingQuantity = rawMaterial[0].quantity;
    const rawMaterialName = rawMaterial[0].material_name;
    res.json({ usageDetails, remainingQuantity, rawMaterialName });
  } catch (err) {
    console.error("Error fetching usage details:", err);
    res.status(500).json({ error: "Failed to fetch usage details" });
  }
});

module.exports = router;
