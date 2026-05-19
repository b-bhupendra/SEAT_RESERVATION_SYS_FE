import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePayment } from '../hooks/usePayment';
import { QRCodeSVG } from 'qrcode.react';

export function Checkout({ billData }) {
  const {
    isProcessing,
    isWaitingForCallback,
    paymentStatus,
    initiatePayment,
    pollPaymentStatus
  } = usePayment();

  const [qrUrl, setQrUrl] = useState(null);

  const handleCheckout = async () => {
    // Prevent double submissions
    if (isProcessing || isWaitingForCallback) return;

    const res = await initiatePayment({
      amount: billData.amount,
      user_id: billData.customer_id,
      mobile_number: '9999999999' // Sourced dynamically in production
    });

    if (res && res.redirect_url && res.transaction_id) {
      setQrUrl(res.redirect_url);
      pollPaymentStatus(res.transaction_id);
    }
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
    <div className="max-w-md mx-auto bg-black border border-white/20 font-mono text-white select-none">
      
      {/* Telemetry Header */}
      <div className="border-b border-white/20 p-4 flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary">SECURE CHECKOUT</h2>
          <p className="text-[9px] text-muted-foreground mt-1 uppercase">PhonePe S2S Integration</p>
        </div>
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
      </div>

      <div className="p-4 space-y-4">
        {/* Ledger Grid */}
        <div className="border border-white/20 p-3 bg-white/5 space-y-2">
          <div className="flex justify-between items-center border-b border-dashed border-white/20 pb-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Amount Due</span>
            <span className="text-sm text-primary font-bold">₹{billData?.amount ? Number(billData.amount).toFixed(2) : '0.00'}</span>
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Gateway Link</span>
            <span className="text-[10px] font-bold text-white uppercase">PhonePe Active</span>
          </div>
        </div>

        {/* Action / Status Region */}
        <AnimatePresence mode="wait">
          {paymentStatus === 'SUCCESS' ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 border border-green-500/50 text-green-500 text-[10px] uppercase font-bold text-center tracking-widest"
            >
              [ PAYMENT CONFIRMED ]
            </motion.div>
          ) : paymentStatus === 'FAILED' ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 border border-red-500/50 text-red-500 text-[10px] uppercase font-bold text-center tracking-widest"
            >
              [ ERR: TXN FAILED OR PENDING ]
            </motion.div>
          ) : qrUrl ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center p-6 border border-white/20 bg-white/5 space-y-4"
            >
              <div className="p-3 bg-white">
                <QRCodeSVG value={qrUrl} size={180} />
              </div>
              <div className="flex items-center gap-2 text-primary text-[10px] uppercase font-bold tracking-widest">
                <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="h-1.5 w-1.5 bg-primary" />
                <span>[ AWAITING CALLBACK ]</span>
              </div>
            </motion.div>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={isProcessing || isWaitingForCallback}
              className="w-full relative group min-h-[44px] flex items-center justify-center border border-primary bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase transition-colors hover:bg-primary/20 active:bg-primary/30 disabled:opacity-50 disabled:border-muted-foreground disabled:text-muted-foreground disabled:bg-transparent"
            >
              {isProcessing ? (
                <span>[ INIT GATEWAY ]</span>
              ) : (
                <span>[ INITIATE TXN : ₹{billData?.amount || '0.00'} ]</span>
              )}
            </button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
