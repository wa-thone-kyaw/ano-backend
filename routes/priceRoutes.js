const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");
router.get("/latest-price/:productId", async (req, res) => {
  const productId = req.params.productId;

  try {
    const [latestPrice] = await executeQuery(
      `
      SELECT price, effective_date 
      FROM price
      WHERE product_id = ? 
      ORDER BY effective_date DESC 
      LIMIT 1
    `,
      [productId]
    );

    if (latestPrice) {
      res.json({
        success: true,
        price: latestPrice.price,
        effective_date: latestPrice.effective_date,
      });
    } else {
      res
        .status(404)
        .json({ success: false, message: "Price not found for this product" });
    }
  } catch (error) {
    console.error("Error fetching the latest price:", error);
    res.status(500).json({ success: false, message: "Database error", error });
  }
});

// Fetch all prices (optional, adjust as necessary)
router.get("/", async (req, res) => {
  try {
    const results = await executeQuery("SELECT * FROM price");
    res.json(results);
  } catch (err) {
    console.error("Error fetching prices:", err);
    res.status(500).json({ error: "Failed to fetch prices" });
  }
});

module.exports = router;
