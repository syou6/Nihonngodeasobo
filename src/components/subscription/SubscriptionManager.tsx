import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Zap, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { StripeService, pricingPlans, PricingPlan } from '../../lib/stripe';
import { useAuthStore } from '../../stores/authStore';
import { EN } from '../../i18n/en';
import toast from 'react-hot-toast';

interface SubscriptionStatus {
  status: string;
  plan_id: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

export const SubscriptionManager: React.FC = () => {
  const { user } = useAuthStore();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSubscriptionStatus();
    }
  }, [user]);

  const loadSubscriptionStatus = async () => {
    if (!user) return;

    try {
      const status = await StripeService.getSubscriptionStatus(user.id);
      setSubscription(status);
    } catch (error) {
      toast.error(EN.subscription.error.loadStatus);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: PricingPlan) => {
    if (!user || !plan.stripePriceId) return;

    setProcessing(plan.id);
    try {
      await StripeService.createCheckoutSession(plan.stripePriceId, user.id);
    } catch (error) {
      toast.error(EN.subscription.error.checkout);
    } finally {
      setProcessing(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    setProcessing('manage');
    try {
      const portalUrl = await StripeService.getCustomerPortalUrl(user.id);
      window.open(portalUrl, '_blank');
    } catch (error) {
      toast.error(EN.subscription.error.portal);
    } finally {
      setProcessing(null);
    }
  };

  const getCurrentPlan = () => {
    return pricingPlans.find(plan => plan.id === subscription?.plan_id) || pricingPlans[0];
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free': return <Zap className="w-6 h-6" />;
      case 'premium': return <Crown className="w-6 h-6" />;
      default: return <Zap className="w-6 h-6" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const currentPlan = getCurrentPlan();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {EN.subscription.title}
          </h1>
          <p className="text-xl text-gray-600">
            {EN.subscription.subtitle}
          </p>
        </div>

        {/* Current Plan */}
        <div className="mb-12">
          <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-indigo-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                  {getPlanIcon(currentPlan.id)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {currentPlan.name}
                  </h2>
                  <p className="text-gray-600">
                    {subscription?.status === 'active' ? EN.subscription.active : EN.subscription.freePlan}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">
                  {'$'}{currentPlan.price}
                </div>
                <div className="text-gray-600">
                  {currentPlan.interval === 'month' ? EN.subscription.perMonth : EN.subscription.perYear}
                </div>
              </div>
            </div>

            {subscription?.current_period_end && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <Calendar className="w-4 h-4" />
                <span>
                  {EN.subscription.nextRenewal}: {new Date(subscription.current_period_end).toLocaleDateString('en-US')}
                </span>
                {subscription.cancel_at_period_end && (
                  <span className="flex items-center gap-1 text-orange-600">
                    <AlertCircle className="w-4 h-4" />
                    {EN.subscription.cancelScheduled}
                  </span>
                )}
              </div>
            )}

            {subscription?.status === 'active' && (
              <Button
                onClick={handleManageSubscription}
                disabled={processing === 'manage'}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {processing === 'manage' ? EN.subscription.processing : EN.subscription.manage}
              </Button>
            )}
          </div>
        </div>

        {/* Plan List */}
        <div className="grid md:grid-cols-2 gap-8">
          {pricingPlans.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan.id;
            const isPopular = plan.id === 'premium';

            return (
              <motion.div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg p-8 ${
                  isPopular ? 'ring-2 ring-indigo-500 scale-105' : ''
                } ${isCurrentPlan ? 'opacity-75' : ''}`}
                whileHover={{ scale: isCurrentPlan ? 1 : 1.02 }}
                transition={{ duration: 0.2 }}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-indigo-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      {EN.subscription.popular}
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <div className={`p-3 rounded-xl ${
                      plan.id === 'free' ? 'bg-gray-100 text-gray-600' :
                      'bg-indigo-100 text-indigo-600'
                    }`}>
                      {getPlanIcon(plan.id)}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {'$'}{plan.price}
                  </div>
                  <div className="text-gray-600">
                    {plan.interval === 'month' ? EN.subscription.perMonth : EN.subscription.perYear}
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCurrentPlan || processing === plan.id || !plan.stripePriceId}
                  variant={isPopular ? 'primary' : 'outline'}
                  className="w-full"
                >
                  {isCurrentPlan ? EN.subscription.currentPlan :
                   processing === plan.id ? EN.subscription.processing :
                   plan.id === 'free' ? EN.subscription.startFree : EN.subscription.selectPlan}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Usage */}
        <div className="mt-12 bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            {EN.subscription.usage}
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600 mb-2">0</div>
              <div className="text-gray-600">{EN.subscription.recordings}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">0</div>
              <div className="text-gray-600">{EN.subscription.savedDiaries}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">0</div>
              <div className="text-gray-600">{EN.subscription.sharedMembers}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
