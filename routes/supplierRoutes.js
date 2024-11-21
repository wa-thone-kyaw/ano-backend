// supplierRoutes.js
const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");
const dayjs = require("dayjs");

// Fetch all suppliers
router.get("/", async (req, res) => {
  try {
    const results = await executeQuery("SELECT * FROM suppliers");
    res.json(results);
  } catch (err) {
    console.error("Error fetching suppliers:", err);
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});

// Create a new supplier
router.post("/", async (req, res) => {
  const {
    name,
    address,
    contactPerson, // This should map to 'contact_person' in your DB
    phone,
    email,
    source, // Use 'source' for local/foreign mapping
    joinDate,
  } = req.body;

  // Ensure joinDate is properly formatted
  const formattedJoinDate = joinDate
    ? dayjs(joinDate).format("YYYY-MM-DD")
    : null;

  try {
    await executeQuery(
      "INSERT INTO suppliers (name, address, contact_person, phone, email, source, join_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        name,
        address,
        contactPerson,
        phone,
        email,
        source, // Change to 'source' to match your DB column
        formattedJoinDate,
      ]
    );
    res.status(201).json({ message: "Supplier created successfully" });
  } catch (err) {
    console.error("Error creating supplier:", err);
    res.status(500).json({ error: "Failed to create supplier" });
  }
});

// Update a supplier
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, address, contactPerson, phone, email, source, joinDate } =
    req.body;

  // Use the joinDate directly without reformatting, to avoid timezone issues
  try {
    await executeQuery(
      "UPDATE suppliers SET name = ?, address = ?, contact_person = ?, phone = ?, email = ?, source = ?, join_date = ? WHERE id = ?",
      [name, address, contactPerson, phone, email, source, joinDate, id]
    );
    res.status(200).json({ message: "Supplier updated successfully" });
  } catch (err) {
    console.error("Error updating supplier:", err);
    res.status(500).json({ error: "Failed to update supplier" });
  }
});

// Delete a supplier
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await executeQuery("DELETE FROM suppliers WHERE id = ?", [id]);
    res.status(200).json({ message: "Supplier deleted successfully" });
  } catch (err) {
    console.error("Error deleting supplier:", err);
    res.status(500).json({ error: "Failed to delete supplier" });
  }
});

module.exports = router;
