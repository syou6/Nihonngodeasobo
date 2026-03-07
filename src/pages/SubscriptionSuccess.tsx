import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EN } from '../i18n/en';

export const SubscriptionSuccess: React.FC = () => {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
      localStorage.setItem('stripe_session_id', sessionId);
    }
  }, []);

  return (
    <div className="flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-8 h-8 text-green-600" />
        </motion.div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {EN.subscriptionResult.successTitle}
        </h1>

        <p className="text-gray-600 mb-8">
          {EN.subscriptionResult.successMessage}
        </p>

        <div className="space-y-4">
          <Button
            onClick={() => window.location.href = '/app.html'}
            variant="primary"
            className="w-full"
          >
            {EN.subscriptionResult.startApp}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            {EN.subscriptionResult.premiumActivated}
          </p>
        </div>
      </motion.div>
    </div>
  );
};
