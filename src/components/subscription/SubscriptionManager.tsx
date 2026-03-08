import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Crown, Zap, CreditCard, Calendar, AlertCircle, X, Heart, TrendingUp, Shield, Mic, BookOpen } from 'lucide-react';
import { Button } from '../ui/Button';
import { StripeService, pricingPlans, PricingPlan } from '../../lib/stripe';
import { useAuthStore } from '../../stores/authStore';
import { useSubscription } from '../../hooks/useSubscription';
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
  const { usage } = useSubscription();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [cancelStep, setCancelStep] = useState(0);

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
              <div className="flex gap-3">
                <Button
                  onClick={handleManageSubscription}
                  disabled={processing === 'manage'}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {processing === 'manage' ? EN.subscription.processing : 'Payment Settings'}
                </Button>
                <button
                  onClick={() => { setShowCancelWarning(true); setCancelStep(0); }}
                  className="text-sm text-gray-400 hover:text-gray-500 underline underline-offset-2"
                >
                  Cancel plan
                </button>
              </div>
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

      {/* ── Cancel Retention Modal ──────────────────────────────── */}
      <AnimatePresence>
        {showCancelWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCancelWarning(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
            >
              {cancelStep === 0 && (
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                      <Heart className="w-6 h-6 text-red-500" />
                    </div>
                    <button onClick={() => setShowCancelWarning(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">We'd hate to see you go!</h3>
                  <p className="text-gray-600 text-sm mb-6">
                    If you cancel, you'll lose access to these features at the end of your billing period:
                  </p>

                  <div className="space-y-3 mb-6">
                    {[
                      { icon: Mic, text: 'Unlimited diary recordings', sub: `You've recorded ${usage.diaryCount} this month` },
                      { icon: TrendingUp, text: 'Detailed AI grammar feedback', sub: 'Personalized corrections on every entry' },
                      { icon: BookOpen, text: 'Unlimited JLPT speaking practice', sub: 'Daily practice sessions' },
                      { icon: Shield, text: 'Unlimited diary storage', sub: 'All your entries will be kept forever' },
                    ].map(({ icon: Icon, text, sub }) => (
                      <div key={text} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                        <Icon className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{text}</p>
                          <p className="text-xs text-gray-500">{sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    On the free plan, you'll only get <span className="font-bold text-red-600">3 recordings/month</span> and diaries are <span className="font-bold text-red-600">deleted after 7 days</span>.
                  </p>

                  <Button
                    variant="primary"
                    className="w-full mb-3"
                    onClick={() => setShowCancelWarning(false)}
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Keep My Premium
                  </Button>
                  <button
                    onClick={() => setCancelStep(1)}
                    className="w-full text-center text-sm text-gray-400 hover:text-gray-500 py-2"
                  >
                    I still want to cancel
                  </button>
                </div>
              )}

              {cancelStep === 1 && (
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-yellow-600" />
                    </div>
                    <button onClick={() => setShowCancelWarning(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Before you go...</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    What if we could help? Tell us why you're leaving:
                  </p>

                  <div className="space-y-2 mb-6">
                    {['Too expensive', 'Not using it enough', 'Missing features', 'Found an alternative', 'Other'].map((reason) => (
                      <button
                        key={reason}
                        onClick={() => setCancelStep(2)}
                        className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-sm text-gray-700 transition-colors"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowCancelWarning(false)}
                    className="w-full text-center text-sm text-brand-600 font-medium py-2"
                  >
                    Never mind, I'll stay!
                  </button>
                </div>
              )}

              {cancelStep === 2 && (
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Zap className="w-6 h-6 text-green-600" />
                    </div>
                    <button onClick={() => setShowCancelWarning(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Special offer just for you!</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    We don't want you to lose your progress. How about <span className="font-bold text-green-600">50% off your next month</span>?
                  </p>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6 text-center">
                    <p className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">Stay & Save</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl text-gray-400 line-through">$9.99</span>
                      <span className="text-3xl font-black text-green-600">$4.99</span>
                      <span className="text-sm text-gray-500">/month</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">Applied automatically to your next billing</p>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full mb-3 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setShowCancelWarning(false);
                      toast.success('50% discount applied to your next billing!');
                    }}
                  >
                    Claim 50% Off & Stay
                  </Button>

                  <button
                    onClick={() => {
                      setShowCancelWarning(false);
                      handleManageSubscription();
                    }}
                    className="w-full text-center text-xs text-gray-400 hover:text-gray-500 py-2"
                  >
                    No thanks, proceed to cancel
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
