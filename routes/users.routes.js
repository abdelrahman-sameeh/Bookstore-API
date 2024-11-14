const express = require("express");
const { isAuth } = require("../controllers/auth.controllers");
const { checkIsExistUser } = require("../controllers/user.controllers");

const router = express.Router();

router.get("/users/:id", isAuth, checkIsExistUser);

module.exports = router;
