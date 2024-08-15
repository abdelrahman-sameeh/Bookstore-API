function calculateStripeFee(amount) {
  const percentageFee = 0.029; // 2.9%
  const flatFee = .3; // $0.30 in cents

  const fee = Math.ceil((+amount * percentageFee) + flatFee);
  return fee;
}


module.exports =  calculateStripeFee
