import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EN } from '../i18n/en';

export const SubscriptionCancel: React.FC = () => {
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
          className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <XCircle className="w-8 h-8 text-orange-600" />
        </motion.div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {EN.subscriptionResult.cancelTitle}
        </h1>

        <p className="text-gray-600 mb-8">
          {EN.subscriptionResult.cancelMessage}
        </p>

        <div className="space-y-4">
          <Button
            onClick={() => window.location.href = '/app.html'}
            variant="primary"
            className="w-full"
          >
            {EN.subscriptionResult.backToApp}
            <ArrowLeft className="w-4 h-4 ml-2" />
          </Button>

          <Button
            onClick={() => window.location.href = '/app.html?view=pricing'}
            variant="outline"
            className="w-full"
          >
            {EN.subscriptionResult.reviewPlans}
            <RefreshCw className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            {EN.subscriptionResult.freeFeatures}
          </p>
        </div>
      </motion.div>
    </div>
  );
};
