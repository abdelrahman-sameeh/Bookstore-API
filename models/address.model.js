const { default: mongoose } = require("mongoose");

const addressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
  },
  country: String,
  city: String,
  address: String,
  phone: String,
}, {timestamps: true})


const Address = mongoose.model('Address', addressSchema)

module.exports = Address
