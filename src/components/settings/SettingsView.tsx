import React, { useState } from 'react';
import { CEFRSettings } from './CEFRSettings';
import { FamilyManager } from '../family/FamilyManager';
import { PricingCards } from '../subscription/PricingCards';
import { ApiUsageMonitor } from '../ApiUsageMonitor';
import { useAuthStore } from '../../stores/authStore';
import { useSubscription } from '../../hooks/useSubscription';
import { EN } from '../../i18n/en';
import type { JLPTLevel } from '../../types';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronUp, Activity, Crown } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { user, updateJlptLevel } = useAuthStore();
  const { isPremium } = useSubscription();
  const [showApiUsage, setShowApiUsage] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);

  const handleJlptChange = async (level: JLPTLevel) => {
    try {
      await updateJlptLevel(level);
      toast.success(`JLPT level updated to ${level}`);
    } catch (error: any) {
      const message = error?.message || 'Unknown error';
      toast.error(`Failed to update JLPT level: ${message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
        {EN.nav.settings}
      </h1>

      {/* JLPT Level Settings */}
      <CEFRSettings
        currentLevel={user?.jlpt_level || 'N4'}
        onLevelChange={handleJlptChange}
      />

      {/* Subscription */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div
          onClick={() => setShowSubscription(!showSubscription)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Crown className={`w-5 h-5 ${isPremium ? 'text-brand-600' : 'text-gray-600'}`} />
            <div>
              <span className="font-medium text-gray-900">Subscription</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                isPremium ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {isPremium ? 'Premium' : 'Free'}
              </span>
            </div>
          </div>
          {showSubscription ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
        {showSubscription && (
          <div className="px-6 pb-6">
            <PricingCards currentPlan={isPremium ? 'premium' : 'free'} />
          </div>
        )}
      </div>

      {/* Teacher Connection */}
      <FamilyManager />


      {/* API Usage Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div
          onClick={() => setShowApiUsage(!showApiUsage)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">{EN.settings.apiUsage || 'API Usage'}</span>
          </div>
          {showApiUsage ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
        {showApiUsage && (
          <div className="px-6 pb-6">
            <ApiUsageMonitor />
          </div>
        )}
      </div>
    </div>
  );
};
