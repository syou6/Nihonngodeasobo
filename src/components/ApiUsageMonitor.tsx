import React, { useEffect, useState } from 'react';
import { getCurrentUsageStats, resetUsage } from '../lib/api-limiter';
import { useGuestStore } from '../stores/guestStore';
import { AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { EN } from '../i18n/en';

interface ApiUsageMonitorProps {
  embedded?: boolean;
}

export const ApiUsageMonitor: React.FC<ApiUsageMonitorProps> = ({ embedded = true }) => {
  const [stats, setStats] = useState(getCurrentUsageStats());
  const [showDetails, setShowDetails] = useState(false);
  const { isGuestMode, aiUsageCount } = useGuestStore();

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getCurrentUsageStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Dev-only widget: bail out after hooks so hook order stays stable.
  if (import.meta.env.PROD) return null;

  const usagePercentage = (stats.dailyUsed / stats.dailyLimit) * 100;
  const isNearLimit = usagePercentage > 80;
  const isAtLimit = stats.remainingRequests === 0;

  return (
    <div className={embedded ? '' : 'fixed bottom-4 right-4 z-50'}>
      <div
        className={`bg-gray-50 rounded-lg p-4 ${
          isAtLimit ? 'border-2 border-red-500' : isNearLimit ? 'border-2 border-yellow-500' : 'border border-gray-200'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            {isGuestMode ? (
              <>
                <Zap className="w-4 h-4 text-purple-500" />
                {EN.apiUsage.guestMode}
              </>
            ) : (
              <>
                <AlertCircle className={`w-4 h-4 ${
                  isAtLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : 'text-blue-500'
                }`} />
                {EN.apiUsage.usage}
              </>
            )}
          </h3>
          {!isGuestMode && (
            <span
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              {showDetails ? EN.apiUsage.simple : EN.apiUsage.details}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {/* Guest mode display */}
          {isGuestMode ? (
            <>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>{EN.apiUsage.aiUsage}:</span>
                  <span className={`font-semibold ${aiUsageCount >= 1 ? 'text-red-500' : ''}`}>
                    {aiUsageCount} / 1 {EN.apiUsage.times}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{EN.apiUsage.status}:</span>
                  <span className="font-semibold">
                    {aiUsageCount >= 1 ? EN.apiUsage.used : EN.apiUsage.available}
                  </span>
                </div>
              </div>
              {aiUsageCount >= 1 && (
                <div className="bg-purple-50 text-purple-700 text-xs p-2 rounded">
                  {EN.apiUsage.aiLimitGuest}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Normal mode progress bar */}
              <div
                className="w-full h-2 overflow-hidden"
                style={{ backgroundColor: '#e5e7eb', borderRadius: '4px', border: 'none' }}
              >
                <div
                  className="h-2 transition-all"
                  style={{
                    width: `${Math.min(100, usagePercentage)}%`,
                    backgroundColor: isAtLimit ? '#ef4444' : isNearLimit ? '#eab308' : '#3b82f6',
                    borderRadius: '4px'
                  }}
                />
              </div>

              {/* Basic info */}
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>{EN.apiUsage.todayUsage}:</span>
                  <span className="font-semibold">
                    {stats.dailyUsed} / {stats.dailyLimit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{EN.apiUsage.remaining}:</span>
                  <span className={`font-semibold ${isAtLimit ? 'text-red-500' : ''}`}>
                    {stats.remainingRequests} {EN.apiUsage.times}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Detailed info */}
          {showDetails && (
            <div className="border-t pt-2 mt-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span>{EN.apiUsage.estimatedTokens}:</span>
                <span>{stats.tokensUsed.toLocaleString()} / {stats.tokensLimit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>{EN.apiUsage.estimatedCost}:</span>
                <span>${(stats.tokensUsed * 0.00001).toFixed(4)}</span>
              </div>
            </div>
          )}

          {/* Warning messages */}
          {isAtLimit && (
            <div className="bg-red-50 text-red-700 text-xs p-2 rounded mt-2">
              {EN.apiUsage.limitReached}
            </div>
          )}
          {!isAtLimit && isNearLimit && (
            <div className="bg-yellow-50 text-yellow-700 text-xs p-2 rounded mt-2">
              {EN.apiUsage.nearLimit}
            </div>
          )}

          {/* Reset button (dev only) */}
          {import.meta.env.DEV && (
            <button
              onClick={() => {
                resetUsage();
                setStats(getCurrentUsageStats());
              }}
              className="w-full mt-2 flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1 px-2 rounded"
            >
              <RefreshCw className="w-3 h-3" />
              {EN.apiUsage.resetUsage}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
