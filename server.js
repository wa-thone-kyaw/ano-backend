const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config();

const productRoutes = require("./routes/productRoutes");
const typeRoutes = require("./routes/typeRoutes");
const colorRoutes = require("./routes/colorRoutes");
const customerRoutes = require("./routes/customerRoutes");
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes");
const signUpRoutes = require("./routes/signUpRoutes");
const loginRoutes = require("./routes/loginRoutes");
const rawMaterialRoutes = require("./routes/rawMaterialRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const priceRoutes = require("./routes/priceRoutes");
const roleRoutes = require("./routes/roleRoutes");
const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Use the routes
app.use("/products", productRoutes);
app.use("/types", typeRoutes);
app.use("/colors", colorRoutes);
app.use("/users", userRoutes);
app.use("/customers", customerRoutes);
app.use("/orders", orderRoutes);
app.use("/signup", signUpRoutes);
app.use("/login", loginRoutes);
app.use("/raw-materials", rawMaterialRoutes);
app.use("/suppliers", supplierRoutes);
app.use("/categories", categoryRoutes);
app.use("/prices", priceRoutes);
app.use("/roles", roleRoutes);
app.use("/permissions", roleRoutes);
app.use("/roles-with-permissions", roleRoutes);
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log("JWT_SECRET:", process.env.JWT_SECRET);

  console.log(`Server running on port  http://localhost:${PORT}/ `);
});
