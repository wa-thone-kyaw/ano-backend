const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");

// Fetch all categories
router.get("/", async (req, res) => {
  try {
    const results = await executeQuery(
      "SELECT * FROM category ORDER BY id DESC"
    );
    res.json(results);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Create a new category
router.post("/", async (req, res) => {
  const { category_name } = req.body;
  try {
    await executeQuery("INSERT INTO category (category_name) VALUES (?)", [
      category_name,
    ]);
    res.status(201).json({ message: "Category created successfully" });
  } catch (err) {
    console.error("Error creating category:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// Update an existing category
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { category_name } = req.body;
  try {
    await executeQuery("UPDATE category SET category_name = ? WHERE id = ?", [
      category_name,
      id,
    ]);
    res.json({ message: "Category updated successfully" });
  } catch (err) {
    console.error("Error updating category:", err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// Delete a category
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Check if the category is used in any product
    const productCheck = await executeQuery(
      "SELECT COUNT(*) as count FROM product WHERE category_id = ?",
      [id]
    );

    if (productCheck[0].count > 0) {
      return res.status(400).json({
        error:
          "Category cannot be deleted; it is in use by one or more products.",
      });
    }

    await executeQuery("DELETE FROM category WHERE id = ?", [id]);
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

module.exports = router;
