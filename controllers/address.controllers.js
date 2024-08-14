const asyncHandler = require("../middlewares/asyncHandler");
const Address = require("../models/address.model");

exports.createAddress = asyncHandler(async (req, res, next) => {
  const data = {
    country: req.body.country.trim().toLowerCase(),
    city: req.body.city.trim().toLowerCase(),
    address: req.body.address.trim().toLowerCase(),
    phone: req.body.phone.trim().toLowerCase(),
    user: req.user,
  };
  const address = new Address(data);
  await address.save();

  // Construct the response without the user data
  const responseData = {
    country: address.country,
    city: address.city,
    address: address.address,
    phone: address.phone,
    _id: address._id,
    user: req.user._id,
  };

  res.status(201).json({
    status: "success",
    data: {
      address: responseData,
    },
  });
});

exports.getLoggedUserAddresses = asyncHandler(async (req, res, next) => {
  const addresses = await Address.find({ user: req.user._id });
  res.status(200).json({ status: "success", data: { addresses } });
});

exports.getUserAddresses = asyncHandler(async (req, res, next) => {
  const addresses = await Address.find({ user: req.params.userId });
  res.status(200).json({ status: "success", data: { addresses } });
});

exports.updateAddress = asyncHandler(async (req, res, next) => {
  const data = {};
  for (const field of Object.entries(req.body)) {
    data[field[0]] = field[1].toLowerCase().trim();
  }

  const address = await Address.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    data,
    { new: true }
  );

  res.status(200).json({ status: "success", data: { address } });
});

exports.deleteAddress = asyncHandler(async (req, res, next) => {
  await Address.findOneAndDelete({
    _id: req.params.id,
  });
  res.status(204).json();
});


