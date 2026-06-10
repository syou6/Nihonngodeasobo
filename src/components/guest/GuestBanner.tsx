import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, LogIn, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { useGuestStore } from '../../stores/guestStore';
import { EN } from '../../i18n/en';

interface GuestBannerProps {
  // The 'tries' limit applies to the Voice Diary only. On the (unlimited) pitch
  // trainer / karte, showing 'X tries remaining' falsely implies a cap and scares
  // guests off — so those tabs pass showTries={false}.
  showTries?: boolean;
}

export const GuestBanner: React.FC<GuestBannerProps> = ({ showTries = true }) => {
  const { getRemainingTries, isGuestMode, setGuestMode, clearGuestData } = useGuestStore();
  const remaining = getRemainingTries();
  const subtitle = showTries
    ? `${remaining} ${EN.guestMode.remaining}`
    : 'Free unlimited pitch scoring — sign up to save your progress';

  if (!isGuestMode) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white p-3 sm:p-4 shadow-lg"
    >
      <div className="max-w-6xl mx-auto">
        {/* Mobile layout */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <div className="flex-1">
                <p className="font-bold text-sm">{EN.guestMode.banner}</p>
                <p className="text-xs opacity-90">{subtitle}</p>
              </div>
            </div>
            <Button
              onClick={() => {
                clearGuestData();
                setGuestMode(false);
                sessionStorage.setItem('showAuthForm', 'true');
                window.location.reload();
              }}
              variant="primary"
              size="sm"
              className="!bg-white !text-orange-600 hover:!bg-orange-50 !border !border-white !px-3 !py-1.5 !min-h-0 !text-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>{EN.guestMode.login}</span>
            </Button>
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden sm:flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6" />
            <div>
              <p className="font-bold text-lg">{EN.guestMode.banner}</p>
              <p className="text-sm opacity-90">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <p className="text-xs opacity-90">{EN.guestMode.loginPrompt}</p>
              <p className="text-sm font-semibold flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                {EN.guestMode.createAccount}
              </p>
            </div>
            <Button
              onClick={() => {
                clearGuestData();
                setGuestMode(false);
                sessionStorage.setItem('showAuthForm', 'true');
                window.location.reload();
              }}
              variant="primary"
              size="md"
              className="!bg-white !text-orange-600 hover:!bg-orange-50 !border-2 !border-white"
            >
              <LogIn className="w-4 h-4" />
              {EN.guestMode.loginSignup}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
