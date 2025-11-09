import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();
// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  try {
    const msg = {
      to,
      from: process.env.FROM_EMAIL,
      subject,
      html,
    };

    await sgMail.send(msg);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('sendEmail error:', error);
    if (error.response) {
      console.error('SendGrid error details:', error.response.body);
    }
    throw new Error('Email could not be sent');
  }
};

export default sendEmail;
