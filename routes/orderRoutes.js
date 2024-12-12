const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");

// Get all orders
router.get("/", async (req, res) => {
  try {
    const orders = await executeQuery(`
      SELECT DISTINCT orders.id, orders.quantity, customers.name AS customer_name, 
             product.product_name AS product_name, prices.price AS product_price, 
             orders.total, orders.delivery_address, orders.note, orders.status, orders.order_date
      FROM orders 
      JOIN customers ON orders.customer_id = customers.id 
      JOIN product ON orders.product_id = product.id
      JOIN product_prices ON product.id = product_prices.product_id
      JOIN prices ON product_prices.price_id = prices.id
    `);

    res.status(200).json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Error fetching orders" });
  }
});

router.post("/", async (req, res) => {
  const {
    customer_id,
    product_id,
    quantity,
    delivery_address,
    note,
    status = "Pending",
  } = req.body;

  try {
    // Check inventory
    const inventory = await executeQuery(
      `SELECT quantity FROM inventory WHERE product_id = ?`,
      [product_id]
    );

    if (inventory.length === 0 || inventory[0].quantity < quantity) {
      return res
        .status(400)
        .json({ message: "Insufficient inventory for this product." });
    }

    // Reduce inventory quantity
    await executeQuery(
      `UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?`,
      [quantity, product_id]
    );

    const productPrice = await executeQuery(
      `SELECT prices.price 
       FROM product_prices 
       JOIN prices ON product_prices.price_id = prices.id 
       WHERE product_prices.product_id = ?`,
      [product_id]
    );

    const total = productPrice[0].price * quantity;

    const result = await executeQuery(
      "INSERT INTO orders (customer_id, product_id, quantity, total, delivery_address, note, status , order_date) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
      [customer_id, product_id, quantity, total, delivery_address, note, status]
    );

    res
      .status(201)
      .json({ message: "Order created successfully", id: result.insertId });
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ message: "Error creating order" });
  }
});

// Update an existing order
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { customer_id, product_id, quantity, delivery_address, note, status } =
    req.body;

  try {
    // Fetch current order to calculate quantity difference
    const currentOrder = await executeQuery(
      `SELECT product_id, quantity FROM orders WHERE id = ?`,
      [id]
    );

    if (currentOrder.length === 0) {
      return res.status(404).json({ message: "Order not found." });
    }

    const currentQuantity = currentOrder[0].quantity;
    const quantityDifference = quantity - currentQuantity;

    // Check inventory if quantity is being increased
    if (quantityDifference > 0) {
      const inventory = await executeQuery(
        `SELECT quantity FROM inventory WHERE product_id = ?`,
        [product_id]
      );

      if (
        inventory.length === 0 ||
        inventory[0].quantity < quantityDifference
      ) {
        return res
          .status(400)
          .json({ message: "Insufficient inventory for this product." });
      }
    }

    // Update inventory
    await executeQuery(
      `UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?`,
      [quantityDifference, product_id]
    );

    const productPrice = await executeQuery(
      `SELECT prices.price 
       FROM product_prices 
       JOIN prices ON product_prices.price_id = prices.id 
       WHERE product_prices.product_id = ?`,
      [product_id]
    );

    const total = productPrice[0].price * quantity;

    await executeQuery(
      "UPDATE orders SET customer_id = ?, product_id = ?, quantity = ?, delivery_address = ?, note = ?, total = ?, status = ? WHERE id = ?",
      [
        customer_id,
        product_id,
        quantity,
        delivery_address,
        note,
        total,
        status,
        id,
      ]
    );

    res.status(200).json({ message: "Order updated successfully" });
  } catch (err) {
    console.error("Error updating order:", err);
    res.status(500).json({ message: "Error updating order" });
  }
});

// Update order status
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["Pending", "Complete"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value." });
  }

  try {
    await executeQuery("UPDATE orders SET status = ? WHERE id = ?", [
      status,
      id,
    ]);
    res.status(200).json({ message: "Order status updated successfully." });
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ message: "Error updating order status" });
  }
});

// Delete an order
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const currentOrder = await executeQuery(
      `SELECT product_id, quantity FROM orders WHERE id = ?`,
      [id]
    );

    if (currentOrder.length === 0) {
      return res.status(404).json({ message: "Order not found." });
    }

    const { product_id, quantity } = currentOrder[0];

    // Restore inventory
    await executeQuery(
      `UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?`,
      [quantity, product_id]
    );

    await executeQuery("DELETE FROM orders WHERE id = ?", [id]);

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).json({ message: "Error deleting order" });
  }
});

module.exports = router;
