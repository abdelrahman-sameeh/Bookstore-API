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
  .post(isAuth, allowTo("admin"), createCouponValidator, createCoupon)
  .get(isAuth, allowTo("admin"), getCoupons);

router
  .route("/coupon/:id")
  .get(isAuth, allowTo("admin"), getDeleteOneCouponValidator, getOneCoupon)
  .put(isAuth, allowTo("admin"), updateOneCouponValidator, updateOneCoupon)
  .delete(
    isAuth,
    allowTo("admin"),
    getDeleteOneCouponValidator,
    deleteOneCoupon
  );

module.exports = router;
