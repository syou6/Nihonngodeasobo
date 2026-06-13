import React, { useEffect, useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useGuestStore } from '../stores/guestStore';
import { AuthForm } from '../components/auth/AuthForm';
import { Header } from '../components/navigation/Header';
import { LearnerDashboard } from '../components/dashboard/LearnerDashboard';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';
import { GuestBanner } from '../components/guest/GuestBanner';
import { WelcomeGuide } from '../components/onboarding/WelcomeGuide';
import { OnboardingFlow } from '../components/onboarding/OnboardingFlow';
import { HelpButton } from '../components/help/HelpButton';
import { FeedbackPrompt } from '../components/feedback/FeedbackPrompt';
import { trackPageView, identify } from '../lib/analytics';
import { supabase } from '../lib/supabase';
import { EN } from '../i18n/en';

// Code-split the non-initial views so the first paint (home/record) ships a
// smaller bundle. Each becomes its own chunk loaded on demand.
const VoiceRecorder = lazy(() => import('../components/recording/VoiceRecorder').then((m) => ({ default: m.VoiceRecorder })));
const DiaryList = lazy(() => import('../components/diary/DiaryList').then((m) => ({ default: m.DiaryList })));
const FamilyManager = lazy(() => import('../components/family/FamilyManager').then((m) => ({ default: m.FamilyManager })));
const SettingsView = lazy(() => import('../components/settings/SettingsView').then((m) => ({ default: m.SettingsView })));
const PricingCards = lazy(() => import('../components/subscription/PricingCards').then((m) => ({ default: m.PricingCards })));
const VersantHome = lazy(() => import('../components/versant/VersantHome').then((m) => ({ default: m.VersantHome })));
const PitchPractice = lazy(() => import('../components/pitch/PitchPractice').then((m) => ({ default: m.PitchPractice })));
const EarSprint = lazy(() => import('../components/pitch/EarSprint').then((m) => ({ default: m.EarSprint })));
const KartePage = lazy(() => import('../components/karte/KartePage').then((m) => ({ default: m.KartePage })));
const SubscriptionSuccess = lazy(() => import('./SubscriptionSuccess').then((m) => ({ default: m.SubscriptionSuccess })));
const SubscriptionCancel = lazy(() => import('./SubscriptionCancel').then((m) => ({ default: m.SubscriptionCancel })));

const ViewFallback = () => (
  <div className="flex justify-center py-20">
    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
  </div>
);

export const AppPage: React.FC = () => {
  const [currentView, setCurrentView] = useState('home');
  // Guest experience leads with pitch (the shareable aha); diary is secondary.
  // 'karte' is reachable via ?view=karte (the registration carrot after the aha).
  const [guestTab, setGuestTab] = useState<'ear' | 'pitch' | 'karte'>(() => {
    const v = new URLSearchParams(window.location.search).get('view');
    return v === 'karte' ? 'karte' : v === 'ear' ? 'ear' : 'pitch';
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAuthFormState, setShowAuthFormState] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(() => !!localStorage.getItem('onboardingCompleted'));
  const { user, loading, initialize, updateName } = useAuthStore();
  const { isGuestMode, cleanExpiredDiaries, setGuestMode } = useGuestStore();

  // ログイン済みユーザーがいる場合、ゲストモードをリセット
  useEffect(() => {
    if (user && isGuestMode) {
      setGuestMode(false);
    }
  }, [user, isGuestMode, setGuestMode]);

  // Analytics: associate events with the user, and log each in-app view change.
  useEffect(() => {
    identify(user?.id ?? null);
  }, [user?.id]);

  useEffect(() => {
    trackPageView(currentView);
  }, [currentView]);

  useEffect(() => {
    // アプリを使用したことを記録
    localStorage.setItem('hasUsedApp', 'true');

    // 強制ゲストモードを無効化（普通の動作に戻す）

    // 環境変数が設定されていない場合は即座にゲストモードで開始
    const hasValidConfig = import.meta.env.VITE_SUPABASE_URL && 
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      import.meta.env.VITE_SUPABASE_URL !== 'your_supabase_url' &&
      import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your_supabase_anon_key';

    // URLパラメータをチェック
    const urlParams = new URLSearchParams(window.location.search);
    const isGuestParam = urlParams.get('guest') === 'true';

    if (!hasValidConfig) {
      setGuestMode(true);
      // A visitor arriving with ?guest=true (the LP "Score My Pitch" CTA) goes
      // straight to the pitch trainer — no onboarding wall before the aha.
      setShowOnboarding(!isGuestParam);
      setIsInitialized(true);
      return;
    }

    const isSignupParam = urlParams.get('signup') === 'true';
    const isLoginParam = urlParams.get('login') === 'true';
    const viewParam = urlParams.get('view');
    
    // サインアップパラメータがある場合
    if (isSignupParam) {
      sessionStorage.setItem('showSignupForm', 'true');
      setShowAuthFormState(true);
      setGuestMode(false);
      setIsInitialized(true);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('signup');
      window.history.replaceState({}, '', newUrl.toString());
      return;
    }

    // ログインパラメータがある場合
    if (isLoginParam) {
      sessionStorage.removeItem('showSignupForm');
      setShowAuthFormState(true);
      setGuestMode(false);
      setIsInitialized(true);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('login');
      window.history.replaceState({}, '', newUrl.toString());
      return;
    }
    
    // ゲストパラメータがある場合: skip onboarding and drop them straight into the
    // pitch trainer (the aha). Every extra step before it costs conversions.
    if (isGuestParam) {
      setGuestMode(true);
      setShowOnboarding(false);
      setIsInitialized(true);
      // URLからパラメータを削除
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('guest');
      window.history.replaceState({}, '', newUrl.toString());
      return;
    }
    
    // ビューパラメータがあれば設定
    if (viewParam) {
      setCurrentView(viewParam);
      // URLからパラメータを削除
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('view');
      window.history.replaceState({}, '', newUrl.toString());
    }
    
    // 認証フォーム表示フラグをチェック（最優先）
    if (sessionStorage.getItem('showAuthForm') === 'true') {
      sessionStorage.removeItem('showAuthForm');
      setShowAuthFormState(true);
      setGuestMode(false);
      setIsInitialized(true);
      return;
    }
    
    // 環境変数が設定されている場合は認証を試行
    if (hasValidConfig) {
      // Cap auth init at 5s so a slow network can't keep the loading screen up.
      const initTimeout = new Promise<void>((resolve) => setTimeout(resolve, 5000));
      Promise.race([
        initialize().catch(() => {
          setGuestMode(true);
          setShowOnboarding(true);
        }),
        initTimeout,
      ]).finally(() => {
        setIsInitialized(true);
      });
    } else {
      // 環境変数が未設定の場合はゲストモードで開始
      setGuestMode(true);
      setShowOnboarding(true);
      setIsInitialized(true);
    }
    
    // 期限切れのゲスト日記をクリーンアップ
    cleanExpiredDiaries();
    
    // メンテナンスモードチェック（無効化）
    // const checkMaintenanceMode = async () => {
    //   try {
    //     const { data } = await supabase
    //       .from('maintenance_mode')
    //       .select('is_enabled')
    //       .single();
    //     
    //     if (data?.is_enabled) {
    //       setIsMaintenanceMode(true);
    //     }
    //   } catch (error) {
    //     console.log('Maintenance mode check failed:', error);
    //   }
    // };
    // 
    // checkMaintenanceMode();
  }, [initialize, setGuestMode, cleanExpiredDiaries]);

  // Maintenance mode
  if (isMaintenanceMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Under Maintenance
          </h1>
          <p className="text-gray-600">
            We're currently performing maintenance. Please check back soon.
          </p>
        </div>
      </div>
    );
  }

  // 認証フォーム表示（loadingより優先）
  if (showAuthFormState || (isInitialized && !loading && !user && !isGuestMode)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AuthForm />
        <Toaster position="top-center" />
      </div>
    );
  }

  // Loading state
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{EN.common.loading}</p>
        </div>
      </div>
    );
  }

  // ゲストモード
  if (isGuestMode && !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <GuestBanner showTries={false} />
        <div className="container mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            {showOnboarding ? (
              <motion.div
                key="onboarding"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <WelcomeGuide onComplete={() => {
                  setShowOnboarding(false);
                }} />
              </motion.div>
            ) : (
              <motion.div
                key="guest-app"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="max-w-4xl mx-auto">
                  {/* Guest tabs — Ear Sprint (no-mic game) leads, then trainer + Karte */}
                  <div className="flex gap-2 mb-6 bg-white rounded-full p-1 shadow-card w-fit mx-auto">
                    <button
                      onClick={() => setGuestTab('ear')}
                      className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${guestTab === 'ear' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      👂 Ear Sprint
                    </button>
                    <button
                      onClick={() => setGuestTab('pitch')}
                      className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${guestTab === 'pitch' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      🎯 Trainer
                    </button>
                    <button
                      onClick={() => setGuestTab('karte')}
                      className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${guestTab === 'karte' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      📋 Karte
                    </button>
                  </div>

                  {guestTab === 'ear' ? (
                    <Suspense fallback={<ViewFallback />}>
                      <EarSprint onBack={() => setGuestTab('pitch')} onGoTrainer={() => setGuestTab('pitch')} onSignup={() => setShowAuthFormState(true)} />
                    </Suspense>
                  ) : guestTab === 'karte' ? (
                    <Suspense fallback={<ViewFallback />}>
                      <KartePage onBack={() => setGuestTab('pitch')} onViewChange={() => setGuestTab('pitch')} />
                    </Suspense>
                  ) : (
                    <Suspense fallback={<ViewFallback />}>
                      <PitchPractice onBack={() => setGuestTab('ear')} onViewKarte={() => setGuestTab('karte')} />
                    </Suspense>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <Toaster position="top-center" />
      </div>
    );
  }

  // Check if first-time logged-in user needs onboarding
  const needsOnboarding = user && !onboardingDone;

  if (needsOnboarding) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OnboardingFlow
          onComplete={(data) => {
            localStorage.setItem('onboardingCompleted', 'true');
            setOnboardingDone(true);
            if (data.jlptLevel) {
              localStorage.setItem('jlptLevel', data.jlptLevel);
            }
            if (data.name) {
              updateName(data.name).catch(() => {
                // Non-fatal: name save failed, user can update in settings later
              });
            }
          }}
          show={true}
        />
        <Toaster position="top-center" />
      </div>
    );
  }

  // メインアプリ
  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      
      {isOffline && (
        <div className="bg-yellow-500 text-white text-center py-2 px-4 text-sm font-medium">
          Offline - Some features may not be available.
          <button onClick={() => window.location.reload()} className="ml-2 underline font-bold">
            Retry
          </button>
        </div>
      )}
      <main className="container mx-auto px-4 py-8">
        <Suspense fallback={<ViewFallback />}>
        <AnimatePresence mode="wait">
          {currentView === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <LearnerDashboard onViewChange={setCurrentView} />
            </motion.div>
          )}
          
          {currentView === 'record' && (
            <motion.div
              key="record"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <VoiceRecorder onViewChange={setCurrentView} />
            </motion.div>
          )}
          
          {currentView === 'diary' && (
            <motion.div
              key="diary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <DiaryList onViewChange={setCurrentView} />
            </motion.div>
          )}
          
          {currentView === 'family' && (
            <motion.div
              key="family"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <FamilyManager />
            </motion.div>
          )}
          
          {currentView === 'pricing' && (
            <motion.div
              key="pricing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <PricingCards onClose={() => setCurrentView('home')} />
            </motion.div>
          )}

          {currentView === 'ear' && (
            <motion.div
              key="ear"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <EarSprint onBack={() => setCurrentView('home')} onGoTrainer={() => setCurrentView('pitch')} />
            </motion.div>
          )}

          {currentView === 'pitch' && (
            <motion.div
              key="pitch"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <PitchPractice onBack={() => setCurrentView('home')} onViewKarte={() => setCurrentView('karte')} />
            </motion.div>
          )}

          {currentView === 'karte' && (
            <motion.div
              key="karte"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <KartePage onBack={() => setCurrentView('home')} onViewChange={setCurrentView} />
            </motion.div>
          )}

          {currentView === 'practice' && (
            <motion.div
              key="practice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <VersantHome onViewChange={setCurrentView} />
            </motion.div>
          )}

          {currentView === 'subscription-success' && (
            <motion.div
              key="subscription-success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SubscriptionSuccess />
            </motion.div>
          )}

          {currentView === 'subscription-cancel' && (
            <motion.div
              key="subscription-cancel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SubscriptionCancel />
            </motion.div>
          )}

          {currentView === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SettingsView />
            </motion.div>
          )}
        </AnimatePresence>
        </Suspense>
      </main>

      <PWAInstallPrompt />
      <HelpButton />
      <FeedbackPrompt />
      <Toaster position="top-center" />
    </div>
  );
};
