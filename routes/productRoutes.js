//before add color attribute

const path = require("path");
const fs = require("fs");
const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");
const upload = require("../config/multerConfig");

router.get("/", async (req, res) => {
  let {
    _page = 1,
    _limit = 5,
    product_name_like,
    type_id,
    color_id,
  } = req.query;

  const page = parseInt(_page, 10) || 1;
  const limit = parseInt(_limit, 10) || 5;
  const offset = (page - 1) * limit;

  if (page < 1 || limit < 1) {
    return res
      .status(400)
      .json({ error: "Page and limit must be greater than 0" });
  }

  let whereClauses = [];
  let params = [];

  if (product_name_like) {
    whereClauses.push("p.product_name LIKE ?");
    params.push(`%${product_name_like}%`);
  }

  if (type_id) {
    whereClauses.push("p.type_id = ?");
    params.push(type_id);
  }

  if (color_id) {
    whereClauses.push("p.color_id = ?");
    params.push(color_id);
  }

  const whereClause =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  try {
    const results = await executeQuery(
      `SELECT p.product_id, 
       p.product_name, 
       p.type_id, 
       p.color_id, 
       p.size, 
       p.category_id, 
       p.mo_number,
       p.microwave_safe, 
       p.description, 
       p.is_active, 
       p.created_at, 
       p.updated_at, 
       pr.price, 
       ph.photo,
       i.quantity, 
       i.reorder_level, 
       w.warehouse_name
FROM (
    SELECT DISTINCT p.id AS product_id, 
                    p.product_name, 
                    p.type_id, 
                    p.color_id, 
                    p.category_id, 
                    p.size, 
                    p.mo_number,
                    p.microwave_safe, 
                    p.description, 
                    p.is_active, 
                    p.created_at, 
                    p.updated_at
    FROM product p
    ORDER BY p.created_at DESC
    LIMIT 5 OFFSET 0
) AS p
LEFT JOIN photo ph ON p.product_id = ph.product_id
LEFT JOIN product_prices pp ON p.product_id = pp.product_id
LEFT JOIN prices pr ON pp.price_id = pr.id
LEFT JOIN inventory i ON p.product_id = i.product_id
LEFT JOIN warehouse w ON i.warehouse_id = w.id;

`, // Corrected 'pr.prices' to 'pr.price'

      [...params, limit, offset]
    );

    const totalCount = await executeQuery(
      `SELECT COUNT(DISTINCT p.id) AS count 
       FROM product p 
       ${whereClause}`,
      [...params]
    );

    const products = results.reduce((acc, row) => {
      const {
        product_id,
        product_name,
        type_id,
        color_id,
        category_id,
        size,
        mo_number,

        microwave_safe,
        description,
        is_active,
        created_at,
        updated_at,
        price,
        photo,
        quantity,
        reorder_level,
        warehouse_name,
      } = row;

      if (!acc[product_id]) {
        acc[product_id] = {
          id: product_id,
          product_name,
          type_id,
          color_id,
          category_id,
          size,
          mo_number,

          microwave_safe,
          description,
          is_active,
          created_at,
          updated_at,
          price,
          photos: [],
          quantity,
          reorder_level,
          warehouse_name,
        };
      }

      if (photo) {
        acc[product_id].photos.push(photo);
      }

      return acc;
    }, {});

    res.setHeader("x-total-count", totalCount[0].count);
    res.json({
      products: Object.values(products),
      totalCount: totalCount[0].count,
      page,
      limit,
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Get product details by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const results = await executeQuery(
      `SELECT 
          p.id AS product_id, 
          p.product_name, 
          p.type_id, 
          p.size, 
          p.mo_number, 
          p.category_id, 
          p.description, 
          p.created_at, 
          p.updated_at, 
          p.microwave_safe, 
          p.is_active, 
          ph.photo, 
          i.quantity, 
          i.reorder_level, 
          w.warehouse_name, 
          pr.price, 
          pr.currency, 
          c.id AS color_id, 
          c.color_name, 
          c.color_code, 
          ppb.pcs_per_box 
       FROM product p
       LEFT JOIN photo ph ON p.id = ph.product_id
       LEFT JOIN product_prices pp ON p.id = pp.product_id
       LEFT JOIN prices pr ON pp.price_id = pr.id
       LEFT JOIN product_colors pc ON p.id = pc.product_id
       LEFT JOIN color c ON pc.color_id = c.id
       LEFT JOIN product_pcs_per_box pppb ON p.id = pppb.product_id
       LEFT JOIN pcs_per_box ppb ON pppb.pcs_per_box_id = ppb.id
       LEFT JOIN inventory i ON p.id = i.product_id
       LEFT JOIN warehouse w ON i.warehouse_id = w.id
       WHERE p.id = ?`,
      [id]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Transform the results into a structured object
    const product = results.reduce((acc, row) => {
      const {
        product_id,
        product_name,
        type_id,
        category_id,
        size,
        mo_number,
        description,
        created_at,
        updated_at,
        microwave_safe,
        is_active,
        photo,
        quantity,
        reorder_level,
        warehouse_name,
        price,
        currency,
        color_id,
        color_name,
        color_code,
        pcs_per_box,
      } = row;

      // Initialize the product object if it doesn't exist
      if (!acc) {
        acc = {
          id: product_id,
          product_name,
          type_id,
          category_id,
          size,
          mo_number,
          description,
          created_at,
          updated_at,
          microwave_safe: Boolean(microwave_safe),
          is_active: Boolean(is_active),
          quantity,
          reorder_level,
          warehouse_name,
          photos: [],
          prices: [],
          colors: [],
          pcs_per_box: [],
        };
      }

      // Add photo if it exists
      if (photo && !acc.photos.includes(photo)) acc.photos.push(photo);

      // Add price if it exists and is unique
      if (price && currency) {
        const priceEntry = { price, currency };
        if (
          !acc.prices.some((p) => p.price === price && p.currency === currency)
        ) {
          acc.prices.push(priceEntry);
        }
      }

      // Add color if it exists and is unique
      if (color_id && color_name) {
        const colorEntry = { id: color_id, name: color_name, code: color_code };
        if (!acc.colors.some((c) => c.id === color_id)) {
          acc.colors.push(colorEntry);
        }
      }

      // Add pcs_per_box if it exists and is unique
      if (pcs_per_box && !acc.pcs_per_box.includes(pcs_per_box)) {
        acc.pcs_per_box.push(pcs_per_box);
      }

      return acc;
    }, null);

    res.json(product);
    console.log("Product details being sent:", product);
  } catch (err) {
    console.error("Error fetching product details:", err);
    res.status(500).json({ error: "Failed to fetch product details" });
  }
});

router.put("/:id", upload.array("photos", 4), async (req, res) => {
  const { id } = req.params;
  const {
    product_name,
    type_id,
    color_id,
    size,
    mo_number,
    price,
    category_id,
    microwave_safe,
    description,
    is_active,
    quantity,
    reorder_level,
  } = req.body;

  const photo_urls = req.files.map((file) => file.filename);

  // Ensure that `color_id` is either a valid integer or `null`
  const validColorId = color_id === "null" || !color_id ? null : color_id;

  try {
    // Ensure product exists
    const productCheck = await executeQuery(
      "SELECT * FROM product WHERE id = ?",
      [id]
    );
    if (!productCheck.length) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Update product
    await executeQuery(
      "UPDATE product SET product_name = ?, type_id = ?, color_id = ?, size = ?, mo_number = ?, category_id = ?, microwave_safe = ?, description = ?, is_active = ?, updated_at = NOW() WHERE id = ?",
      [
        product_name,
        type_id,
        validColorId, // Use the valid color_id (either null or the actual ID)
        size,
        mo_number,
        category_id,
        microwave_safe,
        description,
        is_active,
        id,
      ]
    );

    // Update inventory
    await executeQuery(
      `UPDATE inventory 
      SET quantity = ?, reorder_level = ?
      WHERE product_id = ?`,
      [quantity, reorder_level, id]
    );

    // Handle photo updates
    if (photo_urls.length > 0) {
      await executeQuery("DELETE FROM photo WHERE product_id = ?", [id]);
      await Promise.all(
        photo_urls.map(async (url) => {
          await executeQuery(
            "INSERT INTO photo (photo, product_id) VALUES (?, ?)",
            [url, id]
          );
        })
      );
    }

    res.status(200).json({ message: "Product updated successfully" });
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// Delete product
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const photoResults = await executeQuery(
      `SELECT ph.id, ph.photo 
       FROM photo ph 
       WHERE ph.product_id = ?`,
      [id]
    );

    photoResults.forEach(({ photo }) => {
      const photoPath = path.join(__dirname, "uploads", photo);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    });

    await executeQuery("DELETE FROM photo WHERE product_id = ?", [id]);
    await executeQuery("DELETE FROM price WHERE product_id = ?", [id]);
    await executeQuery("DELETE FROM product WHERE id = ?", [id]);

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Create product
router.post("/", upload.array("photos", 4), async (req, res) => {
  const {
    product_name,
    type_id,
    color_id,
    size,
    mo_number,
    price,
    category_id,
    microwave_safe,
    description,
    is_active,
    quantity, // New field for product quantity
    reorder_level, // New field for reorder level
  } = req.body;
  const isMicrowaveSafe = microwave_safe === "1" || microwave_safe === 1;
  const isActive = is_active === "1" || is_active === 1;
  const photo_urls = req.files.map((file) => file.filename);

  const categoryCheck = await executeQuery(
    "SELECT COUNT(*) as count FROM category WHERE id = ?",
    [category_id]
  );

  if (categoryCheck[0].count === 0) {
    return res.status(400).json({ error: "Invalid category_id" });
  }

  try {
    // Insert product details into the product table
    const result = await executeQuery(
      "INSERT INTO product (product_name, type_id, color_id, size, mo_number, category_id, microwave_safe, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
      [
        product_name,
        type_id,
        color_id,
        size,
        mo_number,
        category_id,
        isMicrowaveSafe,
        description,
        isActive,
      ]
    );

    const productId = result.insertId;

    // Insert price into the prices table
    const priceResult = await executeQuery(
      "INSERT INTO prices (price, currency, effective_date) VALUES (?, ?, ?)",
      [price, "USD", new Date()]
    );
    const priceId = priceResult.insertId;

    // Associate product with price in the product_prices table
    await executeQuery(
      "INSERT INTO product_prices (product_id, price_id) VALUES (?, ?)",
      [productId, priceId]
    );

    // Insert photos into the photo table
    await Promise.all(
      photo_urls.map(async (url) => {
        await executeQuery(
          "INSERT INTO photo (photo, product_id) VALUES (?, ?)",
          [url, productId]
        );
      })
    );

    // Insert product quantity into the inventory table
    await executeQuery(
      "INSERT INTO inventory (product_id, quantity, reorder_level) VALUES (?, ?, ?)",
      [productId, quantity, reorder_level]
    );

    res.status(201).json({ message: "Product created successfully" });
  } catch (err) {
    console.error("Error creating product:", err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// Update for adding colors, prices, and pcs_per_box
router.put("/:id/attributes", async (req, res) => {
  const { id } = req.params;
  const { colors, prices, pcsPerBox } = req.body;

  try {
    // Insert colors (avoid duplicates)
    if (colors && colors.length > 0) {
      const colorValues = colors.map((color_id) => [id, color_id]);
      await executeQuery(
        `
        INSERT INTO product_color (product_id, color_id)
        VALUES ?
        ON DUPLICATE KEY UPDATE product_id = VALUES(product_id), color_id = VALUES(color_id);
        `,
        [colorValues]
      );
    }

    // Insert prices
    if (prices && prices.length > 0) {
      const priceValues = prices.map(({ value, currency }) => [
        id,
        value,
        currency || "USD",
        new Date(),
      ]);
      await executeQuery(
        `
        INSERT INTO prices (product_id, price, currency, effective_date)
        VALUES ?
        ON DUPLICATE KEY UPDATE price = VALUES(price), currency = VALUES(currency), effective_date = VALUES(effective_date);
        `,
        [priceValues]
      );
    }

    // Insert pcs_per_box (avoid duplicates)
    if (pcsPerBox && pcsPerBox.length > 0) {
      const pcsValues = pcsPerBox.map((pcs) => [id, pcs]);
      await executeQuery(
        `
        INSERT INTO pcs_per_box (product_id, pcs_per_box)
        VALUES ?
        ON DUPLICATE KEY UPDATE pcs_per_box = VALUES(pcs_per_box);
        `,
        [pcsValues]
      );
    }

    res.status(200).json({ message: "Attributes updated successfully!" });
  } catch (err) {
    console.error("Error adding attributes:", err);
    res
      .status(500)
      .json({ error: "Failed to update attributes", details: err.message });
  }
});

module.exports = router;
