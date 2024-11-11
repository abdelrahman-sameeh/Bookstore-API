const asyncHandler = require("../middlewares/asyncHandler");
const { User } = require("../models/user.model");
const ApiError = require("../utils/ApiError");

const checkIsExistUser = asyncHandler(async(req, res, next) => {
  const user = await User.findById(req.params.id)
  if(!user){
    return next(new ApiError("user not found", 404))
  }

  res.status(200).json({
    message: "success",
    data: {
      user: user._id
    }
  })
})


module.exports = {
  checkIsExistUser
}
