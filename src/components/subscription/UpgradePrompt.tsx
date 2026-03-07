import React from 'react';
import { Crown } from 'lucide-react';
import { Button } from '../ui/Button';

interface UpgradePromptProps {
  feature: string;
  onUpgrade: () => void;
  compact?: boolean;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({ feature, onUpgrade, compact = false }) => {
  if (compact) {
    return (
      <button
        onClick={onUpgrade}
        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-200 rounded-lg hover:from-brand-100 hover:to-purple-100 transition-colors w-full"
      >
        <Crown className="w-4 h-4 text-brand-600 flex-shrink-0" />
        <span className="text-sm text-brand-700 font-medium">{feature}</span>
        <span className="text-xs text-brand-500 ml-auto">Upgrade</span>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-200 rounded-xl p-6 text-center">
      <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <Crown className="w-6 h-6 text-brand-600" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">Premium Feature</h3>
      <p className="text-sm text-gray-600 mb-4">{feature}</p>
      <Button variant="primary" size="md" onClick={onUpgrade} className="w-full">
        Upgrade to Premium
      </Button>
      <p className="text-xs text-gray-400 mt-2">Starting at $4.99/month</p>
    </div>
  );
};
