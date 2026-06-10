import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Crown, Mic, TrendingUp, BookOpen, Shield, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { pricingPlans, StripeService, ONBOARDING_COUPON_ID } from '../lib/stripe';
import { useAuthStore } from '../stores/authStore';
import { trackEvent } from '../lib/analytics';
import toast from 'react-hot-toast';

export const SubscriptionCancel: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Win-back: this button starts a checkout with the 50% coupon actually applied
  // (the page previously promised 50% but linked to the full-price pricing modal).
  const claimDiscount = async () => {
    const monthly = pricingPlans.find((p) => p.id === 'premium');
    if (!monthly?.stripePriceId || !user?.id || !ONBOARDING_COUPON_ID) {
      window.location.href = '/app.html?view=pricing';
      return;
    }
    setLoading(true);
    trackEvent('begin_checkout', { plan: 'premium', source: 'cancel_winback' });
    try {
      await StripeService.createCheckoutSession(monthly.stripePriceId, user.id, ONBOARDING_COUPON_ID);
    } catch {
      toast.error('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-lg w-full"
      >
        {/* Warning */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </motion.div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Checkout was cancelled
          </h1>
          <p className="text-gray-600 mb-6">
            No worries — your account is safe. But here's what you're missing out on:
          </p>

          {/* What you're missing */}
          <div className="space-y-3 text-left mb-6">
            {[
              { icon: Mic, text: 'Unlimited voice pitch scoring', free: '5/day on free' },
              { icon: TrendingUp, text: 'Instant drop-location coaching', free: 'Basic only on free' },
              { icon: BookOpen, text: 'Full curriculum + minimal pairs', free: 'Intro words on free' },
              { icon: Shield, text: 'Streak & per-pattern progress', free: 'Not tracked on free' },
            ].map(({ icon: Icon, text, free }) => (
              <div key={text} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <Icon className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{text}</p>
                  <p className="text-xs text-red-500">{free}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Countdown urgency */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 mb-6 text-white">
            <Crown className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm font-bold mb-1">Limited Time: 50% OFF</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg line-through opacity-70">$8.99</span>
              <span className="text-2xl font-black">$4.49</span>
              <span className="text-sm opacity-80">/month</span>
            </div>
            <p className="text-xs opacity-80 mt-1">Discount applied automatically at checkout</p>
          </div>

          <Button
            onClick={claimDiscount}
            variant="primary"
            className="w-full mb-3"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Crown className="w-4 h-4 mr-2" />
            )}
            Get Premium at 50% OFF
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <button
            onClick={() => window.location.href = '/app.html'}
            className="w-full text-center text-sm text-gray-400 hover:text-gray-500 py-2"
          >
            Continue with free plan
          </button>
        </div>

        {/* Social proof */}
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">What premium users say</p>
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700 italic">"I finally stopped sounding foreign — seeing my pitch vs the native made it click."</p>
              <p className="text-xs text-gray-400 mt-1">— Maria, N2 learner from Brazil</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700 italic">"The honest scoring catches the drop I always got wrong. Nothing else does this."</p>
              <p className="text-xs text-gray-400 mt-1">— Thomas, N3 learner from Germany</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
