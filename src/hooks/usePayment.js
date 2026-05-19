import { useState, useCallback } from 'react';
import { api } from '../lib/api';

export function usePayment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWaitingForCallback, setIsWaitingForCallback] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'SUCCESS' | 'FAILED' | 'PENDING'

  /**
   * Initiates the payment process.
   * @param {Object} paymentData - Example: { amount: 500, user_id: 'user123', mobile_number: '9999999999' }
   */
  const initiatePayment = useCallback(async (paymentData) => {
    setIsProcessing(true);
    try {
      // Direct call to our backend, which handles checksum generation and securely calls PhonePe S2S
      const response = await api.post('/api/payment/pay', paymentData);
      
      if (response && response.success && response.redirect_url) {
        // Return the response so the UI can render a QR code using the intent/redirect URL
        return response;
      } else {
        setPaymentStatus('FAILED');
        return null;
      }
    } catch (error) {
      console.error('Payment initiation failed:', error);
      setPaymentStatus('FAILED');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Polls the backend status endpoint with exponential backoff.
   * Useful when returning from gateway before webhook is processed.
   * @param {string} transactionId - The transaction ID to track
   */
  const pollPaymentStatus = useCallback((transactionId) => {
    setIsWaitingForCallback(true);
    let attempts = 0;
    const maxAttempts = 5;
    
    const checkStatus = async () => {
      try {
        const response = await api.get(`/api/payment/status/${transactionId}`);
        if (response.success && response.status === 'PAYMENT_SUCCESS') {
          setPaymentStatus('SUCCESS');
          setIsWaitingForCallback(false);
          return;
        } else if (response.status === 'PAYMENT_ERROR') {
          setPaymentStatus('FAILED');
          setIsWaitingForCallback(false);
          return;
        }
      } catch (err) {
        console.warn('Status poll warning:', err);
      }

      attempts++;
      if (attempts < maxAttempts) {
        // Exponential backoff: 2s, 4s, 8s, 16s...
        const delay = Math.pow(2, attempts) * 1000;
        setTimeout(checkStatus, delay);
      } else {
        // Fallback after max attempts
        setPaymentStatus('PENDING');
        setIsWaitingForCallback(false);
      }
    };

    // Initial check after a slight delay
    setTimeout(checkStatus, 2000);
  }, []);

  return {
    isProcessing,
    isWaitingForCallback,
    paymentStatus,
    initiatePayment,
    pollPaymentStatus
  };
}
