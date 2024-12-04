const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");

router.get("/products", async (req, res) => {
  try {
    const products = await executeQuery("SELECT id, product_name FROM product");
    //console.log("Fetched Products:", products); // Log fetched products
    res.json(products); // JSON response for success
  } catch (err) {
    console.error("Error fetching products:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch products", details: err.message });
  }
});

// Add multiple attributes to a product
// Updated route for adding attributes
// Add multiple attributes to a product
router.post("/attributes", async (req, res) => {
  const { product_id, colors, prices, pcsPerBox } = req.body;

  if (!product_id) {
    return res.status(400).json({ error: "Product ID is required" });
  }

  try {
    // Insert colors (Avoid duplicates)
    if (colors && colors.length > 0) {
      const colorValues = colors.map((color_id) => [product_id, color_id]);
      await executeQuery(
        `
        INSERT INTO product_colors (product_id, color_id)
        VALUES ?
        ON DUPLICATE KEY UPDATE color_id = VALUES(color_id);
        `,
        [colorValues]
      );
    }

    // Insert prices and map them to the product
    if (prices && prices.length > 0) {
      for (const { value, currency } of prices) {
        // Insert the price into the prices table
        const priceResult = await executeQuery(
          `
          INSERT INTO prices (price, currency, effective_date)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE price = VALUES(price), currency = VALUES(currency), effective_date = VALUES(effective_date);
          `,
          [value, currency || "USD", new Date()]
        );

        const priceId = priceResult.insertId; // Get the ID of the inserted/updated price

        // Link the product to the price in the product_prices table
        await executeQuery(
          `
          INSERT INTO product_prices (product_id, price_id)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE price_id = VALUES(price_id);
          `,
          [product_id, priceId]
        );
      }
    }

    // Insert pcs_per_box (Avoid duplicates) and link to product
    if (pcsPerBox && pcsPerBox.length > 0) {
      // First, insert pcs_per_box values
      const pcsValues = pcsPerBox.map((pcs) => [pcs]);
      const pcsResult = await executeQuery(
        `
        INSERT INTO pcs_per_box (pcs_per_box)
        VALUES ?
        ON DUPLICATE KEY UPDATE pcs_per_box = VALUES(pcs_per_box);
        `,
        [pcsValues]
      );

      // Now insert into the product_pcs_per_box table, linking the product to pcs_per_box
      const pcsPerBoxIds = pcsResult.insertId
        ? pcsPerBox.map((pcs, index) => [
            product_id,
            pcsResult.insertId + index,
          ])
        : [];
      if (pcsPerBoxIds.length > 0) {
        await executeQuery(
          `
          INSERT INTO product_pcs_per_box (product_id, pcs_per_box_id)
          VALUES ?
          ON DUPLICATE KEY UPDATE pcs_per_box_id = VALUES(pcs_per_box_id);
          `,
          [pcsPerBoxIds]
        );
      }
    }

    res.status(201).json({ message: "Attributes added successfully!" });
  } catch (err) {
    console.error("Error adding attributes:", err);
    res
      .status(500)
      .json({ error: "Failed to add attributes", details: err.message });
  }
});

router.get("/colors", async (req, res) => {
  try {
    const colors = await executeQuery(
      "SELECT id, color_name, color_code FROM color"
    );
    res.json(colors);
  } catch (err) {
    console.error("Error fetching colors:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch colors", details: err.message });
  }
});

// Get PCS Per Box options
router.get("/pcs-per-box", async (req, res) => {
  try {
    const pcsOptions = await executeQuery(
      "SELECT id, pcs_per_box AS pcs FROM pcs_per_box"
    );
    res.json(pcsOptions); // JSON response for success
  } catch (err) {
    console.error("Error fetching PCS options:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch PCS options", details: err.message });
  }
});

module.exports = router;
