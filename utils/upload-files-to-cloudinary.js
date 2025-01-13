const cloudinary = require("cloudinary").v2;
const util = require("util");
const path = require("path");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const uploadAsync = util.promisify(cloudinary.uploader.upload);

const uploadFilesToCloudinary = async (req, res, next) => {
  if (process.env.MODE == "dev") {
    next();
  } else {
    try {
      // for book image
      if (req.files.image) {
        const imagePath = req.files.image[0].path;
        const imageResult = await uploadAsync(imagePath, {
          folder: path.join("book-store", "images"),
          resource_type: "image",
        });
        req.body.imageCover = imageResult.secure_url;
      }

      // for book pdf
      if (req.files.bookFile) {
        const bookFilePath = req.files.bookFile[0].path;
        const bookFileResult = await uploadAsync(bookFilePath, {
          folder: path.join("book-store", "books"),
          resource_type: "raw",
        });
        req.body.book = bookFileResult.secure_url;
      }

      // for users picture
      if (req.files.picture) {
        const pictureFilePath = req.files.picture[0].path;
        const pictureFileResult = await uploadAsync(pictureFilePath, {
          folder: path.join("book-store", "users-profile-pictures"),
          resource_type: "raw",
        });
        req.body.picture = pictureFileResult.secure_url;
      }

      next();
    } catch (error) {
      res
        .status(500)
        .json({ message: "error uploading files to Cloudinary", error });
    }
  }
};

module.exports = uploadFilesToCloudinary;
