import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePayment } from '../hooks/usePayment';

export function Checkout({ billData }) {
  const {
    isProcessing,
    isWaitingForCallback,
    paymentStatus,
    initiatePayment,
    pollPaymentStatus
  } = usePayment();

  const handleCheckout = () => {
    // Prevent double submissions
    if (isProcessing || isWaitingForCallback) return;

    initiatePayment({
      amount: billData.amount,
      user_id: billData.customer_id,
      mobile_number: '9999999999' // Sourced dynamically in production
    });
  };

  // Poll status scenario (e.g. if the user navigated back via URL params)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const txnId = urlParams.get('txn');
    if (txnId && urlParams.get('sim_success')) {
      pollPaymentStatus(txnId);
    }
  }, [pollPaymentStatus]);

  return (
    <div className="max-w-md mx-auto p-6 bg-white/80 dark:bg-black/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 relative overflow-hidden">
      
      {/* Decorative Gradient Background */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 space-y-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">Complete Payment</h2>
          <p className="text-sm text-muted-foreground font-medium mt-1">Secure via PhonePe Standard Checkout</p>
        </div>

        <div className="p-4 bg-muted/40 rounded-xl space-y-2 border border-border">
          <div className="flex justify-between items-center text-sm font-medium">
            <span className="text-muted-foreground">Amount Due</span>
            <span className="text-lg text-foreground font-bold">₹{billData?.amount || '0.00'}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-medium">
            <span className="text-muted-foreground">Gateway</span>
            <span className="font-bold text-primary">PhonePe</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {paymentStatus === 'SUCCESS' ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-green-500/10 text-green-600 border border-green-500/20 rounded-xl text-center font-bold"
            >
              Payment Confirmed!
            </motion.div>
          ) : paymentStatus === 'FAILED' ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 text-red-600 border border-red-500/20 rounded-xl text-center font-bold"
            >
              Payment Failed or Pending. Please try again.
            </motion.div>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={isProcessing || isWaitingForCallback}
              className="w-full relative group h-12 flex items-center justify-center rounded-xl bg-foreground text-background font-bold text-sm tracking-wide overflow-hidden transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <span>Redirecting to Gateway...</span>
              ) : isWaitingForCallback ? (
                <div className="flex items-center gap-2">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-2 h-2 rounded-full bg-background" 
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                    className="w-2 h-2 rounded-full bg-background" 
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                    className="w-2 h-2 rounded-full bg-background" 
                  />
                  <span>Verifying Status...</span>
                </div>
              ) : (
                <span>Pay ₹{billData?.amount || '0.00'}</span>
              )}
              
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full duration-1000 ease-in-out pointer-events-none" />
            </button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
