const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure the uploads directory exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

// const upload = multer().fields([
//   { name: "photos", maxCount: 5 }, //for new photos
//   { name: "existingPhotos[]", maxCount: 5 }, //for existing photos
// ]);

module.exports = upload;
