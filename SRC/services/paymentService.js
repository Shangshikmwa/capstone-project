import paystack from 'paystack';
paystack.setApiKey(process.env.PAYSTACK_SECRET_KEY); 

export const initializePayment = async (email, amount, reference, metadata = {}) => {
  try {
    const response = await paystack.transaction.initialize({
      email,
      amount: amount * 100, // Convert to kobo
      reference,
      currency: 'NGN',
      metadata,
      channels: ['card'], // Card only
    });

    return response.data;
  } catch (error) {
    throw new Error(`Payment initialization failed: ${error.message}`);
  }
};

export const verifyPayment = async (reference) => {
  try {
    const response = await paystack.transaction.verify(reference);
    return response.data;
  } catch (error) {
    throw new Error(`Payment verification failed: ${error.message}`);
  }
};