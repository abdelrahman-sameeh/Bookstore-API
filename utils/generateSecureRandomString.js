exports.generateSecureRandomString = (length = 6) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const specialChars = '!@#$%&*_';
  const allChars = uppercase + lowercase + digits + specialChars;

  let result = '';

  // Ensure at least one character from each required category
  result += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  result += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  result += digits.charAt(Math.floor(Math.random() * digits.length));
  result += specialChars.charAt(Math.floor(Math.random() * specialChars.length));

  // Fill the rest of the string with random characters from all categories
  for (let i = result.length; i < length; i++) {
    result += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  // Shuffle the string to ensure randomness
  result = result.split('').sort(() => 0.5 - Math.random()).join('');

  return result;
};