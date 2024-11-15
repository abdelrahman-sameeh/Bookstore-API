const multer = require("multer");
const path = require("path");
const fs = require("fs");

const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Set storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "";
    if (file.fieldname === "image") {
      uploadPath = path.join("uploads", "images");
    } else if (file.fieldname === "bookFile") {
      uploadPath = path.join("uploads", "books");
    } else if (file.fieldname === "picture") {
      uploadPath = path.join("uploads", "users", "pictures");
    }
    ensureDirExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// Init upload
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (["picture", "image"].includes(file.fieldname)) {
      checkImageFileType(file, cb);
    } else if (file.fieldname === "bookFile") {
      cb(null, true);
    }
  },
});

// Check Image File Type
function checkImageFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Error: Images Only!");
  }
}

module.exports = upload;
