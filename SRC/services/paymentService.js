// services/paymentService.js
export const initializePayment = async (email, amount, reference, metadata = {}, callbackUrl = null) => {
    try {
      if (!process.env.PAYSTACK_SECRET_KEY) {
        throw new Error('PAYSTACK_SECRET_KEY is not configured');
      }
  
      console.log('Initializing Paystack payment:', { email, amount, reference, callbackUrl });
  
      const requestBody = {
        email,
        amount: amount * 100,
        reference,
        currency: 'NGN',
        metadata,
        channels: ['card'],
      };
  
      // Add redirect URL if provided
      if (callbackUrl) {
        requestBody.callback_url = callbackUrl;
      }
  
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
  
      const data = await response.json();
  
      if (!data.status) {
        throw new Error(`Paystack API error: ${data.message || 'Unknown error'}`);
      }
  
      if (!data.data) {
        throw new Error('Paystack response missing data');
      }
  
      if (!data.data.authorization_url) {
        throw new Error('Paystack response missing authorization_url');
      }
  
      console.log('Payment initialized successfully');
      return data.data;
  
    } catch (error) {
      console.error('Paystack initialization error:', error);
      throw new Error(`Payment initialization failed: ${error.message}`);
    }
  };