//before add color attribute

const path = require("path");
const fs = require("fs");
const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");
const upload = require("../config/multerConfig");

// Get all products without pagination
router.get("/all", async (req, res) => {
  try {
    const results = await executeQuery(
      `SELECT p.id AS product_id, p.product_name, p.type_id, p.color_id, p.size, p.mo_number,p.category_id,p.pcs_per_box, pr.price,pr.effective_date, ph.photo
       FROM product p
       LEFT JOIN photo ph ON p.id = ph.product_id
       LEFT JOIN price pr ON p.id = pr.product_id
       ORDER BY p.id DESC`
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
        price,
        effective_date,
        photo,
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
          prices: [], //array to hold price history
          photos: [],
        };
      }
      if (price !== null) {
        acc[product_id].prices.push({ price, effective_date });
      }
      if (photo) {
        acc[product_id].photos.push(photo);
      }

      return acc;
    }, {});

    res.json(Object.values(products));
  } catch (err) {
    console.error("Error fetching all products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Get products with pagination
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
      `SELECT p.product_id, p.product_name, p.type_id, p.color_id, p.size,p.category_id, p.mo_number, pr.price, ph.photo
   FROM (
     SELECT DISTINCT p.id AS product_id, p.product_name, p.type_id, p.color_id,p.category_id, p.size, p.mo_number
     FROM product p
     LEFT JOIN price pr ON p.id = pr.product_id
     ${whereClause}
     ORDER BY p.id DESC
     LIMIT ? OFFSET ?
   ) AS p
   LEFT JOIN photo ph ON p.product_id = ph.product_id
   LEFT JOIN price pr ON p.product_id = pr.product_id`,
      [...params, limit, offset]
    );

    const totalCount = await executeQuery(
      `SELECT COUNT(DISTINCT p.id) AS count 
       FROM product p 
       ${whereClause}`,
      [...params]
    );

    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found matching the criteria" });
    }

    const products = results.reduce((acc, row) => {
      const {
        product_id,
        product_name,
        type_id,
        color_id,
        category_id,
        size,
        mo_number,
        price,
        photo,
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
          price,
          photos: [],
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
      `SELECT p.id AS product_id, p.product_name, p.type_id, p.color_id, p.size, p.mo_number,p.category_id, pr.price,p.pcs_per_box, ph.photo
       FROM product p
       LEFT JOIN photo ph ON p.id = ph.product_id
       LEFT JOIN price pr ON p.id = pr.product_id
       WHERE p.id = ?`,
      [id]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = results.reduce((acc, row) => {
      const {
        product_id,
        product_name,
        type_id,
        color_id,
        category_id,
        size,
        mo_number,
        price,
        photo,
        pcs_per_box,
      } = row;
      if (!acc) {
        acc = {
          id: product_id,
          product_name,
          type_id,
          color_id,
          category_id,
          size,
          mo_number,
          price,
          pcs_per_box,
          photos: [],
        };
      }
      if (photo) acc.photos.push(photo);
      return acc;
    }, null);

    res.json(product);
  } catch (err) {
    console.error("Error fetching product details:", err);
    res.status(500).json({ error: "Failed to fetch product details" });
  }
});

router.put("/:id", upload.array("photos", 5), async (req, res) => {
  const { id } = req.params;
  const {
    product_name,
    type_id,
    color_id,
    size,
    mo_number,
    price,
    category_id,
    pcs_per_box,
  } = req.body;
  const photo_urls = req.files.map((file) => file.filename);
  try {
    // Update product details
    await executeQuery(
      "UPDATE product SET product_name = ?, type_id = ?, color_id = ?, size = ?, mo_number = ?, category_id = ?, pcs_per_box = ?   WHERE id = ?",
      [
        product_name,
        type_id,
        color_id,
        size,
        mo_number,
        category_id,

        pcs_per_box,
        id,
      ]
    );

    // Insert new price record
    await executeQuery(
      "INSERT INTO price (product_id, price, effective_date) VALUES (?, ?, ?)",
      [id, price, new Date()]
    );

    if (photo_urls.length > 0) {
      // Delete previous photos
      await executeQuery("DELETE FROM photo WHERE product_id = ?", [id]);
      // Insert new photos
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

router.post("/", upload.array("photos", 5), async (req, res) => {
  const {
    product_name,
    type_id,
    color_id,
    size,
    mo_number,
    category_id,
    price,
    pcs_per_box,
  } = req.body;
  const photo_urls = req.files.map((file) => file.filename);

  // Check if category_id exists
  const categoryCheck = await executeQuery(
    "SELECT COUNT(*) as count FROM category WHERE id = ?",
    [category_id]
  );

  if (categoryCheck[0].count === 0) {
    return res.status(400).json({ error: "Invalid category_id" });
  }

  try {
    const result = await executeQuery(
      "INSERT INTO product (product_name, type_id, color_id, size, mo_number, category_id, pcs_per_box) VALUES (?, ?, ?, ?, ?,?, ?)",
      [
        product_name,
        type_id,
        color_id,
        size,
        mo_number,
        category_id,
        pcs_per_box,
      ]
    );

    const productId = result.insertId;
    // Insert initial price
    await executeQuery(
      "INSERT INTO price (product_id, price, effective_date) VALUES (?, ?, ?)",
      [productId, price, new Date()]
    );
    // Insert photos
    await Promise.all(
      photo_urls.map(async (url) => {
        await executeQuery(
          "INSERT INTO photo (photo, product_id) VALUES (?, ?)",
          [url, productId]
        );
      })
    );

    res
      .status(201)
      .json({ message: "Product created successfully", id: productId });
  } catch (err) {
    console.error("Error creating product:", err);
    res.status(500).json({ error: "Failed to create product" });
  }
});
// Route to get total product count
router.get("/count", async (req, res) => {
  try {
    const query = "SELECT COUNT(*) AS totalProducts FROM product";
    const result = await executeQuery(query);
    res.json({ totalProducts: result[0].totalProducts });
  } catch (error) {
    console.error("Error retrieving total products:", error);
    res.status(500).json({ error: "Failed to retrieve total product count" });
  }
});
// Route to get product breakdown by type, color, and category
router.get("/breakdown", async (req, res) => {
  try {
    const typeBreakdown = await executeQuery(
      "SELECT type_id, COUNT(*) AS count FROM product GROUP BY type_id"
    );
    const colorBreakdown = await executeQuery(
      "SELECT color_id, COUNT(*) AS count FROM product GROUP BY color_id"
    );
    const categoryBreakdown = await executeQuery(
      "SELECT category_id, COUNT(*) AS count FROM product GROUP BY category_id"
    );

    res.json({
      typeBreakdown,
      colorBreakdown,
      categoryBreakdown,
    });
  } catch (error) {
    console.error("Error retrieving product breakdown:", error);
    res.status(500).json({ error: "Failed to retrieve product breakdown" });
  }
});

module.exports = router;
