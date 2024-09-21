const path = require("path");

const asyncHandler = (asyncFn) => {
  return (req, res, next) => {
    asyncFn(req, res, next).catch((err) => {
      return next(err);
    });
  };
};

module.exports = asyncHandler;
