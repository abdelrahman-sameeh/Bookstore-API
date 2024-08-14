const nodemailer = require('nodemailer');

exports.sendEmail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
      user: 'allthings112002@gmail.com',
      pass: 'ytof ivpj kdid ltay'
    }
  });

  const mailOptions = {
    from: 'allthings112002@gmail.com',
    to,
    subject,
    text
  };

  await transporter.sendMail(mailOptions);
};
