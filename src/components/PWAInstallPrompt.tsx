import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from './ui/Button';
import { EN } from '../i18n/en';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;

    if (isIOS && !isInStandaloneMode) {
      const hasShownPrompt = localStorage.getItem('ios-pwa-prompt-shown');
      if (!hasShownPrompt) {
        setShowIOSPrompt(true);
        setShowPrompt(true);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleIOSClose = () => {
    localStorage.setItem('ios-pwa-prompt-shown', 'true');
    setShowIOSPrompt(false);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      {showIOSPrompt ? (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 bg-white rounded-2xl shadow-2xl p-4 z-50 max-w-md mx-auto border-2 border-blue-500"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-blue-600" />
              <h3 className="font-bold text-lg">{EN.pwa.useAsApp}</h3>
            </div>
            <button onClick={handleIOSClose} className="text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-3">
            {EN.pwa.iosInstructions}
          </p>

          <div className="bg-blue-50 rounded-lg p-3 text-sm">
            <ol className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">1.</span>
                <span>{EN.pwa.step1}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">2.</span>
                <span>{EN.pwa.step2}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">3.</span>
                <span>{EN.pwa.step3}</span>
              </li>
            </ol>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 bg-white rounded-2xl shadow-2xl p-4 z-50 max-w-md mx-auto border-2 border-blue-500"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <Download className="w-6 h-6 text-blue-600" />
              <h3 className="font-bold text-lg">{EN.pwa.install}</h3>
            </div>
            <button onClick={() => setShowPrompt(false)} className="text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            {EN.pwa.installDescription}
          </p>

          <div className="flex gap-2">
            <Button onClick={handleInstallClick} size="md" className="flex-1">
              <Download className="w-4 h-4" />
              {EN.pwa.installButton}
            </Button>
            <Button
              onClick={() => setShowPrompt(false)}
              variant="outline"
              size="md"
              className="flex-1"
            >
              {EN.pwa.later}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
