const express = require("express");
const { isAuth, allowTo } = require("../controllers/auth.controllers");
const {
  createBook,
  getBooks,
  getOneBook,
  deleteOneBook,
  updateBook,
  reviewBook,
} = require("../controllers/book.controllers");
const upload = require("../utils/uploadFiles");
const {
  createBookValidator,
  deleteBookValidator,
  getBookValidator,
  updateBookValidator,
  reviewBookValidator,
} = require("../validators/book.validator");
const router = express.Router();
const uploadFilesToCloudinary = require("../utils/uploadFilesToCloudinary");

const uploadFields = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "bookFile", maxCount: 1 },
]);

router.get("/admin/books", isAuth, allowTo("admin"), getBooks);
router.get("/owner/books", isAuth, allowTo("owner"), getBooks);

router
  .route("/books")
  .get(getBooks)
  .post(
    isAuth,
    allowTo("owner"),
    uploadFields,
    uploadFilesToCloudinary,
    createBookValidator,
    createBook
  );

router
  .route("/books/:id")
  .get(getBookValidator, getOneBook)
  .put(
    isAuth,
    allowTo("owner"),
    uploadFields,
    uploadFilesToCloudinary,
    updateBookValidator,
    updateBook
  )
  .delete(
    isAuth,
    allowTo("owner"),
    deleteBookValidator,
    deleteOneBook
  );

router.patch(
  "/books/:id/reviewBook",
  isAuth,
  allowTo("admin"),
  reviewBookValidator,
  reviewBook
);



module.exports = router;
