const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");

// Route to add stock
// Route to add stock
router.post("/products/:productId/stock", async (req, res) => {
  const { productId } = req.params;
  const { stock } = req.body;

  if (!productId || stock === undefined || stock <= 0) {
    return res.status(400).json({ error: "Invalid product ID or stock value" });
  }

  try {
    // Check if product exists in the inventory
    const [existingStock] = await executeQuery(
      `SELECT quantity FROM inventory WHERE product_id = ? LIMIT 1`,
      [productId]
    );

    if (existingStock) {
      // Check if the new stock will cause the remaining stock to go negative
      if (existingStock.quantity + stock < 0) {
        return res.status(400).json({ error: "Stock cannot go negative" });
      }

      // If product exists, update the quantity by adding the new stock
      await executeQuery(
        `UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?`,
        [stock, productId]
      );
    } else {
      // If product doesn't exist, insert a new record with the stock quantity
      await executeQuery(
        `INSERT INTO inventory (product_id, quantity, warehouse_id)
         VALUES (?, ?, 1)`,
        [productId, stock]
      );
    }

    // Log the stock addition in the stock_logs table with a timestamp
    await executeQuery(
      `INSERT INTO stock_logs (product_id, added_stock, date_time)
       VALUES (?, ?, NOW())`,
      [productId, stock]
    );

    res.status(200).json({
      message: "Stock added and logged successfully!",
    });
  } catch (err) {
    console.error("Error adding stock:", err);
    res
      .status(500)
      .json({ error: "Failed to add stock", details: err.message });
  }
});

// Route to fetch inventory details
router.get("/inventory", async (req, res) => {
  try {
    const stockData = await executeQuery(
      `SELECT 
        p.id AS product_id,
         p.product_name, 
         i.quantity AS remaining_stock, 
         s.added_stock, 
         s.date_time, 
         s.id AS log_id
       FROM inventory i
       JOIN product p ON i.product_id = p.id
       LEFT JOIN stock_logs s ON i.product_id = s.product_id
       ORDER BY s.date_time DESC`
    );

    res.status(200).json(stockData);
  } catch (err) {
    console.error("Error fetching inventory:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch inventory data", details: err.message });
  }
});

// Route to update stock (editing stock log)
router.put("/stock-log/:logId", async (req, res) => {
  const { logId } = req.params;
  const { stock } = req.body; // Ensure the correct key ('stock') is used here

  if (!logId || stock === undefined || stock <= 0) {
    return res.status(400).json({ error: "Invalid log ID or stock value" });
  }

  try {
    // Get the existing stock log data
    const [stockLog] = await executeQuery(
      `SELECT product_id, added_stock FROM stock_logs WHERE id = ?`,
      [logId]
    );

    if (!stockLog) {
      return res.status(404).json({ error: "Stock log not found" });
    }

    const diff = stock - stockLog.added_stock; // Calculate the difference

    // Get the current inventory stock
    const [currentStock] = await executeQuery(
      `SELECT quantity FROM inventory WHERE product_id = ? LIMIT 1`,
      [stockLog.product_id]
    );

    // Ensure the stock update does not cause negative inventory
    if (currentStock.quantity + diff < 0) {
      return res.status(400).json({ error: "Stock cannot go negative" });
    }

    // Update inventory
    await executeQuery(
      `UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?`,
      [diff, stockLog.product_id]
    );

    // Update stock log
    await executeQuery(
      `UPDATE stock_logs SET added_stock = ?, date_time = NOW() WHERE id = ?`,
      [stock, logId]
    );

    res.status(200).json({ message: "Stock log updated successfully!" });
  } catch (err) {
    console.error("Error updating stock log:", err);
    res
      .status(500)
      .json({ error: "Failed to update stock log", details: err.message });
  }
});

// Route to delete stock log (and adjust inventory)
router.delete("/stock-log/:logId", async (req, res) => {
  const { logId } = req.params;

  if (!logId) {
    return res.status(400).json({ error: "Invalid log ID" });
  }

  try {
    // Get the stock log data to calculate the stock removal
    const [stockLog] = await executeQuery(
      `SELECT product_id, added_stock FROM stock_logs WHERE id = ?`,
      [logId]
    );

    if (!stockLog) {
      return res.status(404).json({ error: "Stock log not found" });
    }

    // Decrease the inventory stock by the added_stock value
    await executeQuery(
      `UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?`,
      [stockLog.added_stock, stockLog.product_id]
    );

    // Delete the stock log entry
    await executeQuery(`DELETE FROM stock_logs WHERE id = ?`, [logId]);

    res.status(200).json({
      message: "Stock log deleted and inventory updated successfully!",
    });
  } catch (err) {
    console.error("Error deleting stock log:", err);
    res
      .status(500)
      .json({ error: "Failed to delete stock log", details: err.message });
  }
});

// Route to fetch stock details for a specific product
// Route to fetch stock details for a specific product
// router.get("/stock-details/:productId", async (req, res) => {
//   const { productId } = req.params;

//   try {
//     // Fetch stock logs and calculate the remaining stock
//     const stockDetails = await executeQuery(
//       `SELECT s.id, s.added_stock, s.date_time,
//               (SELECT SUM(added_stock)
//                FROM stock_logs
//                WHERE product_id = ? AND date_time <= s.date_time) AS remaining_stock
//        FROM stock_logs s
//        WHERE s.product_id = ?
//        ORDER BY s.date_time DESC`,
//       [productId, productId]
//     );

//     // Calculate the total quantity available
//     const totalStock = await executeQuery(
//       `SELECT SUM(added_stock) AS total_stock
//        FROM stock_logs
//        WHERE product_id = ?`,
//       [productId]
//     );

//     res.status(200).json({
//       stockDetails,
//       totalStock: totalStock[0]?.total_stock || 0,
//     });
//   } catch (err) {
//     console.error("Error fetching stock details:", err);
//     res.status(500).json({ error: "Failed to fetch stock details" });
//   }
// });
// Route to fetch stock details for a specific product
router.get("/stock-details/:productId", async (req, res) => {
  const { productId } = req.params;

  try {
    // Fetch stock logs and calculate the remaining stock
    const stockDetails = await executeQuery(
      `SELECT s.id, s.added_stock, s.date_time, 
              (SELECT SUM(added_stock) 
               FROM stock_logs 
               WHERE product_id = ? AND date_time <= s.date_time) AS remaining_stock
       FROM stock_logs s
       WHERE s.product_id = ?
       ORDER BY s.date_time DESC`,
      [productId, productId]
    );

    // Calculate the total quantity available in inventory
    const inventoryData = await executeQuery(
      `SELECT quantity 
       FROM inventory 
       WHERE product_id = ? 
       LIMIT 1`,
      [productId]
    );

    const totalStock = await executeQuery(
      `SELECT SUM(added_stock) AS total_stock 
       FROM stock_logs 
       WHERE product_id = ?`,
      [productId]
    );

    // Fetch product name
    const product = await executeQuery(
      `SELECT product_name 
       FROM product 
       WHERE id = ?`,
      [productId]
    );

    res.status(200).json({
      productName: product[0]?.product_name || "Unknown Product",
      stockDetails,
      totalStock: totalStock[0]?.total_stock || 0,
      remainingStock: inventoryData[0]?.quantity || 0, // Add remaining stock from inventory
    });
  } catch (err) {
    console.error("Error fetching stock details:", err);
    res.status(500).json({ error: "Failed to fetch stock details" });
  }
});

module.exports = router;
