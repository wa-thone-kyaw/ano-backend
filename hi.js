const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Ensure the uploads directory exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const db = mysql.createConnection({
  host: "localhost",
  user: "pos",
  password: "Qf223322",
  database: "ano-pos",
});

// Get all products
app.get("/products", (req, res) => {
  const query = "SELECT * FROM products";
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json(results);
  });
});

// Create a new product
app.post("/products", upload.single("photo"), (req, res) => {
  const { name, group_name, size, packaging, color, price, raw_material_type, machine_type, mo_number } = req.body;
  const photo_url = req.file ? req.file.filename : null; // Save file name in DB
  const query = "INSERT INTO products (name, group_name, size, packaging, color, price, raw_material_type, machine_type, mo_number, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  db.query(query, [name, group_name, size, packaging, color, price, raw_material_type, machine_type, mo_number, photo_url], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.status(201).json({ message: "Product created successfully", productId: results.insertId });
  });
});

// Update a product
app.put("/products/:id", upload.single("photo"), (req, res) => {
  const { id } = req.params;
  const { name, group_name, size, packaging, color, price, raw_material_type, machine_type, mo_number } = req.body;
  const photo_url = req.file ? req.file.filename : null;

  // Get current product photo URL
  db.query("SELECT photo_url FROM products WHERE id = ?", [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    const oldPhotoUrl = results[0]?.photo_url;
    const query = "UPDATE products SET name = ?, group_name = ?, size = ?, packaging = ?, color = ?, price = ?, raw_material_type = ?, machine_type = ?, mo_number = ?, photo_url = ? WHERE id = ?";
    db.query(query, [name, group_name, size, packaging, color, price, raw_material_type, machine_type, mo_number, photo_url, id], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err });
      }
      if (oldPhotoUrl && photo_url && oldPhotoUrl !== photo_url) {
        fs.unlink(`uploads/${oldPhotoUrl}`, (err) => {
          if (err) console.error("Failed to delete old image:", err);
        });
      }
      res.json({ message: "Product updated successfully" });
    });
  });
});

// Delete a product
app.delete("/products/:id", (req, res) => {
  const { id } = req.params;
  // Get current product photo URL
  db.query("SELECT photo_url FROM products WHERE id = ?", [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    const photo_url = results[0]?.photo_url;
    const query = "DELETE FROM products WHERE id = ?";
    db.query(query, [id], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err });
      }
      if (photo_url) {
        fs.unlink(`uploads/${photo_url}`, (err) => {
          if (err) console.error("Failed to delete image:", err);
        });
      }
      res.json({ message: "Product deleted successfully" });
    });
  });
});

// Serve static files
app.use('/uploads', express.static('uploads'));

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
