const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");

// Get all orders
// Get all orders
router.get("/", async (req, res) => {
  try {
    const orders = await executeQuery(`
      SELECT DISTINCT orders.id, orders.quantity, customers.name AS customer_name, 
             product.product_name AS product_name, prices.price AS product_price, 
             orders.total, orders.delivery_address, orders.note
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

// Create a new order
// Create a new order
// router.post("/", async (req, res) => {
//   const { customer_id, product_id, quantity, delivery_address, note } =
//     req.body;

//   try {
//     // Check if the order already exists for the same customer and product
//     const existingOrder = await executeQuery(
//       `SELECT * FROM orders WHERE customer_id = ? AND product_id = ?`,
//       [customer_id, product_id]
//     );

//     if (existingOrder.length > 0) {
//       // If an order exists with the same customer and product, reject the new order
//       return res.status(400).json({ message: "This order already exists." });
//     }

//     // Get the price for the product from the prices table
//     const productPrice = await executeQuery(
//       `SELECT prices.price
//        FROM product_prices
//        JOIN prices ON product_prices.price_id = prices.id
//        WHERE product_prices.product_id = ?`,
//       [product_id]
//     );

//     const total = productPrice[0].price * quantity;

//     const result = await executeQuery(
//       "INSERT INTO orders (customer_id, product_id, quantity, total, delivery_address, note) VALUES (?, ?, ?, ?,?,?)",
//       [customer_id, product_id, quantity, total]
//     );

//     res
//       .status(201)
//       .json({ message: "Order created successfully", id: result.insertId });
//   } catch (err) {
//     console.error("Error creating order:", err);
//     res.status(500).json({ message: "Error creating order" });
//   }
// });
router.post("/", async (req, res) => {
  const { customer_id, product_id, quantity, delivery_address, note } =
    req.body;

  try {
    // Check if the order already exists for the same customer and product
    const existingOrder = await executeQuery(
      `SELECT * FROM orders WHERE customer_id = ? AND product_id = ?`,
      [customer_id, product_id]
    );

    if (existingOrder.length > 0) {
      return res.status(400).json({ message: "This order already exists." });
    }

    const productPrice = await executeQuery(
      `SELECT prices.price 
       FROM product_prices 
       JOIN prices ON product_prices.price_id = prices.id 
       WHERE product_prices.product_id = ?`,
      [product_id]
    );

    const total = productPrice[0].price * quantity;

    const result = await executeQuery(
      "INSERT INTO orders (customer_id, product_id, quantity, total, delivery_address, note) VALUES (?, ?, ?, ?, ?, ?)",
      [customer_id, product_id, quantity, total, delivery_address, note]
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
  const { customer_id, product_id, quantity, delivery_address, note } =
    req.body;

  try {
    const productPrice = await executeQuery(
      `SELECT prices.price 
       FROM product_prices 
       JOIN prices ON product_prices.price_id = prices.id 
       WHERE product_prices.product_id = ?`,
      [product_id]
    );

    const total = productPrice[0].price * quantity;

    await executeQuery(
      "UPDATE orders SET customer_id = ?, product_id = ?, quantity = ?, delivery_address = ?, note = ?, total = ? WHERE id = ?",
      [customer_id, product_id, quantity, delivery_address, note, total, id]
    );

    res.status(200).json({ message: "Order updated successfully" });
  } catch (err) {
    console.error("Error updating order:", err);
    res.status(500).json({ message: "Error updating order" });
  }
});

// Delete an order
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await executeQuery("DELETE FROM orders WHERE id = ?", [id]);
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).json({ message: "Error deleting order" });
  }
});

module.exports = router;
