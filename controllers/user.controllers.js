const asyncHandler = require("../middlewares/asyncHandler");
const { User } = require("../models/user.model");
const ApiError = require("../utils/ApiError");
const { getBaseUrl } = require("../utils/getBaseUrl");


const getLoggedUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  let payload = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    picture: user.picture,
    stripeAccountId: user.stripeAccountId,
    completedBoarding: user.completedBoarding,
  };

  return res.status(200).json({
    status: "success",
    data: { user: payload },
  });
});


const checkIsExistUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new ApiError("user not found", 404));
  }

  res.status(200).json({
    message: "success",
    data: {
      user: user._id,
    },
  });
});

const updateUser = asyncHandler(async (req, res, next) => {
  const { name } = req.body;
  const { MODE } = process.env;
  const pictureFile = req.files["picture"] ? req.files["picture"][0] : null;

  // Prepare updated data
  const newData = {
    ...(name && { name }),
    ...(pictureFile && {
      picture: MODE === "dev" ? pictureFile.path : req.body.picture,
    }),
  };

  // Update the user in the database
  const user = await User.findByIdAndUpdate(req.user._id, newData, {
    new: true,
  });

  // Prepare response payload
  const payload = {
    user: {
      _id: user._id,
      name: user.name,
      role: user.role,
    },
  };

  if (user.picture) {
    const picturePath =
      MODE === "dev"
        ? `${getBaseUrl()}/${user.picture}`
        : user.picture;
    payload.user.picture = picturePath;
  }

  // Send response
  res.status(200).json({
    message: "success",
    data: payload,
  });
});

module.exports = {
  getLoggedUser,
  checkIsExistUser,
  updateUser,
};
