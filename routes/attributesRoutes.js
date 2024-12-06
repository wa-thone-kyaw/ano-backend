const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");

router.get("/products", async (req, res) => {
  try {
    const products = await executeQuery("SELECT id, product_name FROM product");
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch products", details: err.message });
  }
});

// Add multiple attributes to a product
router.post("/attributes", async (req, res) => {
  const { product_id, colors, prices, pcsPerBox, warehouses } = req.body;
  console.log("Received attributes:", req.body);

  if (!product_id) {
    return res.status(400).json({ error: "Product ID is required" });
  }

  try {
    // Insert colors (Avoid duplicates)
    if (colors && colors.length > 0) {
      const colorValues = colors.map((color_id) => [product_id, color_id]);
      await executeQuery(
        `INSERT INTO product_colors (product_id, color_id)
         VALUES ? 
         ON DUPLICATE KEY UPDATE color_id = VALUES(color_id);`,
        [colorValues]
      );
    }

    // Insert prices
    if (prices && prices.length > 0) {
      for (const { value, currency } of prices) {
        const priceResult = await executeQuery(
          `INSERT INTO prices (price, currency, effective_date)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE price = VALUES(price), currency = VALUES(currency), effective_date = VALUES(effective_date);`,
          [value, currency || "USD", new Date()]
        );
        const priceId = priceResult.insertId;
        await executeQuery(
          `INSERT INTO product_prices (product_id, price_id)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE price_id = VALUES(price_id);`,
          [product_id, priceId]
        );
      }
    }

    // Insert PCS Per Box
    if (pcsPerBox && pcsPerBox.length > 0) {
      const pcsPerBoxPlaceholders = pcsPerBox.map(() => "?").join(",");
      const validPcsPerBox = await executeQuery(
        `SELECT id FROM pcs_per_box WHERE pcs_per_box IN (${pcsPerBoxPlaceholders})`,
        pcsPerBox
      );

      if (validPcsPerBox.length !== pcsPerBox.length) {
        return res.status(400).json({
          error: "Some PCS Per Box values are invalid.",
        });
      }

      const pcsPerBoxIds = validPcsPerBox.map((row) => row.id);
      const productPcsPerBoxValues = pcsPerBoxIds.map((id) => [product_id, id]);
      await executeQuery(
        `INSERT INTO product_pcs_per_box (product_id, pcs_per_box_id)
         VALUES ? 
         ON DUPLICATE KEY UPDATE pcs_per_box_id = VALUES(pcs_per_box_id)`,
        [productPcsPerBoxValues]
      );
    }

    // Insert warehouses if present
    if (warehouses && warehouses.length > 0) {
      const warehouseValues = warehouses.map((warehouseId) => [
        product_id,
        warehouseId,
      ]);
      console.log("Inserting into product_warehouse:", warehouseValues);

      const result = await executeQuery(
        `INSERT INTO product_warehouse (product_id, warehouse_id)
         VALUES ? 
         ON DUPLICATE KEY UPDATE warehouse_id = VALUES(warehouse_id)`,
        [warehouseValues]
      );
      console.log("Result from product_warehouse insert:", result);
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
    res.json(pcsOptions);
  } catch (err) {
    console.error("Error fetching PCS Per Box options:", err);
    res.status(500).json({
      error: "Failed to fetch PCS Per Box options",
      details: err.message,
    });
  }
});

router.get("/warehouses", async (req, res) => {
  try {
    const warehouses = await executeQuery(
      "SELECT id, warehouse_name, warehouse_location FROM warehouse"
    );
    res.json(warehouses);
  } catch (err) {
    console.error("Error fetching warehouses:", err);
    res.status(500).json({ error: "Failed to fetch warehouses" });
  }
});

//fro
router.delete("/attributes/remove", async (req, res) => {
  const { product_id, attributeType, attributeId } = req.body;

  if (!product_id || !attributeType || !attributeId) {
    return res.status(400).json({ error: "Invalid request parameters" });
  }

  try {
    let query = "";
    const params = [product_id, attributeId];

    switch (attributeType) {
      case "color":
        query = `DELETE FROM product_colors WHERE product_id = ? AND color_id = ?`;
        break;
      case "price":
        query = `DELETE pp, pr 
                 FROM product_prices pp
                 JOIN prices pr ON pp.price_id = pr.id
                 WHERE pp.product_id = ? AND pp.price_id = ?`;
        break;
      case "pcsPerBox":
        query = `DELETE FROM product_pcs_per_box WHERE product_id = ? AND pcs_per_box_id = ?`;
        break;
      case "warehouse":
        query = `DELETE FROM product_warehouse WHERE product_id = ? AND warehouse_id = ?`;
        break;
      default:
        return res.status(400).json({ error: "Unknown attribute type" });
    }

    await executeQuery(query, params);
    res.status(200).json({ message: "Attribute removed successfully!" });
  } catch (err) {
    console.error("Error removing attribute:", err);
    res.status(500).json({ error: "Failed to remove attribute" });
  }
});
module.exports = router;
