const express = require("express");
const {
  createAddress,
  getLoggedUserAddresses,
  getUserAddresses,
  updateAddress,
  deleteAddress,
} = require("../controllers/address.controllers");
const {
  createAddressValidator,
  updateAddressValidator,
  deleteAddressValidator,
} = require("../validators/address.validator");
const { isAuth, allowTo } = require("../controllers/auth.controllers");
const router = express.Router();

router
  .route("/addresses")
  .post(isAuth, createAddressValidator, createAddress)
  .get(isAuth, getLoggedUserAddresses);

router.get("/addresses/user/:userId", isAuth, allowTo("admin"), getUserAddresses);

router
  .route("/address/:id")
  .put(isAuth, updateAddressValidator, updateAddress)
  .delete(isAuth, deleteAddressValidator, deleteAddress);

module.exports = router;
