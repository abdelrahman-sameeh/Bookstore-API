const express = require("express");
const { isAuth, allowTo } = require("../controllers/auth.controllers");
const {
  createCoupon,
  getCoupons,
  getOneCoupon,
  updateOneCoupon,
  deleteOneCoupon,
} = require("../controllers/coupon.controllers");
const {
  createCouponValidator,
  getDeleteOneCouponValidator,
  updateOneCouponValidator,
} = require("../validators/coupon.validator");
const router = express.Router();

router
  .route("/coupons")
  .post(isAuth, allowTo("owner"), createCouponValidator, createCoupon)
  .get(isAuth, allowTo("owner"), getCoupons);

router
  .route("/coupon/:id")
  .get(isAuth, allowTo("owner"), getDeleteOneCouponValidator, getOneCoupon)
  .put(isAuth, allowTo("owner"), updateOneCouponValidator, updateOneCoupon)
  .delete(
    isAuth,
    allowTo("owner"),
    getDeleteOneCouponValidator,
    deleteOneCoupon
  );

module.exports = router;
