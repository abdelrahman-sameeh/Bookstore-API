function calculateStripeFee(amount) {
  const percentageFee = 0.029; // 2.9%
  const flatFee = .3; // $0.30 in cents

  const fee = (+amount * percentageFee) + flatFee;
  return fee;
}

function calculateOwnerFee(amount) {
  const stripeFee = calculateStripeFee(amount);
  const platformFeesPercentage = 1 - parseFloat(process.env.PLATFORM_FEE_PERCENTAGE); // 90% from amount
  const ownerFee = amount * platformFeesPercentage - stripeFee;
  return +ownerFee.toFixed(2);
}

module.exports =  {
  calculateOwnerFee
}
