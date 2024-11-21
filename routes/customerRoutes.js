const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");

router.get("/", async (req, res) => {
  try {
    const customers = await executeQuery("SELECT * FROM customers");
    res.status(200).json(customers);
  } catch (err) {
    console.error("Error fetching customers:", err);
    res.status(500).json({ message: "Error fetching customers" });
  }
});

router.post("/", async (req, res) => {
  const { name, email, phone, address, business_name } = req.body;
  try {
    const result = await executeQuery(
      "INSERT INTO customers (name, email, phone, address, business_name) VALUES (?, ?, ?, ?, ?)",
      [name, email, phone, address, business_name]
    );
    res
      .status(201)
      .json({ message: "Customer created successfully", id: result.insertId });
  } catch (err) {
    console.error("Error creating customer:", err);
    res.status(500).json({ message: "Error creating customer" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, business_name, orders, amount_spent } =
    req.body;
  try {
    await executeQuery(
      "UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, business_name = ? WHERE id = ?",
      [name, email, phone, address, business_name, id]
    );
    res.status(200).json({ message: "Customer updated successfully" });
  } catch (err) {
    console.error("Error updating customer:", err);
    res.status(500).json({ message: "Error updating customer" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await executeQuery("DELETE FROM customers WHERE id = ?", [id]);
    res.status(200).json({ message: "Customer deleted successfully" });
  } catch (err) {
    console.error("Error deleting customer:", err);
    res.status(500).json({ message: "Error deleting customer" });
  }
});

module.exports = router;
