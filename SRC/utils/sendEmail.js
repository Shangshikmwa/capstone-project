import sgMail from '@sendgrid/mail';

// Set SendGrid API key
const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
  console.error('SENDGRID_API_KEY is not set in environment variables');
}
sgMail.setApiKey(apiKey);

const sendEmail = async ({ to, subject, html }) => {
  try {
    // Validate required environment variables
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY is not configured');
    }
    if (!process.env.FROM_EMAIL) {
      throw new Error('FROM_EMAIL is not configured');
    }

    const msg = {
      to,
      from: process.env.FROM_EMAIL,
      subject,
      html,
    };

    await sgMail.send(msg);
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error('sendEmail error:', error);
    
    // Log detailed SendGrid error information
    if (error.response) {
      const { statusCode, body } = error.response;
      console.error('SendGrid API Error:', {
        statusCode,
        body,
        message: body?.errors?.[0]?.message || 'Unknown SendGrid error'
      });
      
      // Provide more specific error message
      const errorMessage = body?.errors?.[0]?.message || 'SendGrid API error';
      throw new Error(`Email could not be sent: ${errorMessage}`);
    }
    
    // Handle other types of errors
    if (error.message) {
      throw new Error(`Email could not be sent: ${error.message}`);
    }
    
    throw new Error('Email could not be sent: Unknown error');
  }
};

export default sendEmail;
