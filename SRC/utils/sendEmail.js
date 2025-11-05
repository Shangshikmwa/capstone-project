import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD
        }
    });

    await transporter.sendMail({
      from: `"SmartTransit" <${process.env.EMAIL_USERNAME}>`,
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
