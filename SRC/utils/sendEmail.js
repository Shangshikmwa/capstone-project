import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
    });

    await transporter.sendMail({
      from: `"SmartTransit" <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      html
    });

    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('sendEmail error:', error);
    throw new Error('Email could not be sent');
  }
};

export default sendEmail;
