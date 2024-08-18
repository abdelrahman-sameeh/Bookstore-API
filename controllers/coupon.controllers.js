const asyncHandler = require("../middlewares/asyncHandler");
const Coupon = require("../models/coupon.model");
const ApiError = require("../utils/ApiError");
const Pagination = require("../utils/Pagination");

exports.createCoupon = asyncHandler(async (req, res, next) => {
  const data = {
    ...req.body,
    owner: req.user._id
  }
  const coupon = await Coupon.create(data);
  res.status(201).json({
    status: "success",
    data: {
      coupon,
    },
  });
});

exports.getCoupons = asyncHandler(async (req, res, next) => {
  const { available, search, page, limit } = req.query;
  let query = {owner: req.user._id};
  if (available === "true") {
    query.expiryDate = { $gte: new Date() };
  } else if (available === "false") {
    query.expiryDate = { $lt: new Date() };
  }

  if (search) {
    query.code = { $regex: search, $options: "i" };
  }

  const pagination = new Pagination("coupons", Coupon, query, page, limit);
  const result = await pagination.paginate();

  res.status(200).json(result);
});

exports.getOneCoupon = asyncHandler(async (req, res, next) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) return next(new ApiError("coupon not found", 404));

  res.status(200).json({
    status: "success",
    data: {
      coupon,
    },
  });
});

exports.updateOneCoupon = asyncHandler(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {new: true});
  if (!coupon) return next(new ApiError("coupon not found", 404));

  res.status(200).json({
    status: "success",
    data: {
      coupon,
    },
  });

});

exports.deleteOneCoupon = asyncHandler(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) return next(new ApiError("coupon not found", 404));
  res.status(204).json()
});
