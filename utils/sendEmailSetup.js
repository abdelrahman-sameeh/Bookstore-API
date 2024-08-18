const nodemailer = require('nodemailer');

exports.sendEmail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
      user: process.env.SEND_EMAIL_USER,
      pass: process.env.SEND_EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.SEND_EMAIL_USER,
    to,
    subject,
    text
  };

  await transporter.sendMail(mailOptions);
};
