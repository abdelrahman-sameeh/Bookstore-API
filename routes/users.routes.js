const express = require("express");
const { isAuth } = require("../controllers/auth.controllers");
const {
  checkIsExistUser,
  updateUser,
} = require("../controllers/user.controllers");
const upload = require("../utils/uploadFiles");
const uploadFilesToCloudinary = require("../utils/upload-files-to-cloudinary");
const {
  checkIsExistUserValidator,
} = require("../validators/check-is-exist-user.validator");

const router = express.Router();

const uploadFields = upload.fields([{ name: "picture", maxCount: 1 }]);

router.get("/users/:id", isAuth, checkIsExistUserValidator, checkIsExistUser);

router.patch(
  "/user/profile",
  isAuth,
  uploadFields,
  uploadFilesToCloudinary,
  updateUser
);

module.exports = router;
