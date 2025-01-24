function calculateStripeFee(amount) {
  const percentageFee = 0.029; // 2.9%
  const flatFee = .3; // $0.30 in cents

  const fee = (+amount * percentageFee) + flatFee;
  return fee;
}

function calculateOwnerFee(amount) {
  const stripeFee = calculateStripeFee(amount);
  
  // PLATFORM_FEE_PERCENTAGE is expected to be a decimal value, e.g., 0.1 for 10%
  const platformFeePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || "0.1"); // Default to 10% if not set

  // Calculate the owner's portion after deducting platform fees
  const ownerSharePercentage = 1 - platformFeePercentage;
  const ownerFee = (amount * ownerSharePercentage) - stripeFee;

  return +ownerFee.toFixed(2); // Return the owner's fee with 2 decimal precision
}


module.exports =  {
  calculateOwnerFee,
  calculateStripeFee
}
