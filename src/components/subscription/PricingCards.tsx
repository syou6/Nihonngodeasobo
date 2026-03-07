import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Crown, X, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { pricingPlans, StripeService } from '../../lib/stripe';
import toast from 'react-hot-toast';

interface PricingCardsProps {
  currentPlan?: string;
  onClose?: () => void;
}

export const PricingCards: React.FC<PricingCardsProps> = ({ currentPlan = 'free', onClose }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const { user } = useAuthStore();

  const handleSubscribe = async (planId: string, priceId?: string) => {
    if (!user) {
      toast.error('Please login first');
      return;
    }

    if (!priceId) {
      toast.error('This plan is not available yet');
      return;
    }

    setLoading(planId);
    try {
      await StripeService.createCheckoutSession(priceId, user.id);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    try {
      const portalUrl = await StripeService.getCustomerPortalUrl(user.id);
      window.location.href = portalUrl;
    } catch {
      toast.error('Failed to open billing portal');
    }
  };

  const freePlan = pricingPlans.find(p => p.id === 'free')!;
  const premiumPlan = pricingPlans.find(p => p.id === 'premium')!;
  const isPremiumUser = currentPlan === 'premium';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        {onClose && (
          <div className="flex justify-end mb-2">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Unlock Your Full Potential
        </h2>
        <p className="text-gray-600">
          Get unlimited access to all features and accelerate your Japanese learning
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Free Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 p-6"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-1">{freePlan.name}</h3>
          <div className="mb-4">
            <span className="text-3xl font-bold text-gray-900">$0</span>
            <span className="text-gray-500 text-sm ml-1">/month</span>
          </div>

          <ul className="space-y-2.5 mb-6">
            {freePlan.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-600">{feature}</span>
              </li>
            ))}
          </ul>

          {!isPremiumUser && (
            <Button variant="outline" size="md" className="w-full" disabled>
              Current Plan
            </Button>
          )}
        </motion.div>

        {/* Premium Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border-2 border-brand-500 p-6 relative"
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Recommended
            </span>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-brand-600" />
            <h3 className="text-lg font-bold text-gray-900">{premiumPlan.name}</h3>
          </div>
          <div className="mb-4">
            <span className="text-3xl font-bold text-gray-900">$4.99</span>
            <span className="text-gray-500 text-sm ml-1">/month</span>
          </div>

          <ul className="space-y-2.5 mb-6">
            {premiumPlan.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>

          {isPremiumUser ? (
            <div className="space-y-2">
              <Button variant="secondary" size="md" className="w-full" disabled>
                Current Plan
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleManageSubscription}
              >
                Manage Billing
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => handleSubscribe(premiumPlan.id, premiumPlan.stripePriceId)}
              disabled={loading === premiumPlan.id}
            >
              {loading === premiumPlan.id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Upgrade Now'
              )}
            </Button>
          )}
        </motion.div>
      </div>

      {/* Trust signals */}
      <div className="mt-6 text-center space-y-2">
        <p className="text-xs text-gray-400">
          Cancel anytime. Secure payment powered by Stripe.
        </p>
      </div>
    </div>
  );
};
