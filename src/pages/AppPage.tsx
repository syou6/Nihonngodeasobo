import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { useGuestStore } from '../stores/guestStore';
import { AuthForm } from '../components/auth/AuthForm';
import { Header } from '../components/navigation/Header';
import { LearnerDashboard } from '../components/dashboard/LearnerDashboard';
import { VoiceRecorder } from '../components/recording/VoiceRecorder';
import { DiaryList } from '../components/diary/DiaryList';
import { FamilyManager } from '../components/family/FamilyManager';
import { SettingsView } from '../components/settings/SettingsView';
import { PricingCards } from '../components/subscription/PricingCards';
import { VersantHome } from '../components/versant/VersantHome';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';
import { GuestBanner } from '../components/guest/GuestBanner';
import { GuestDiaryList } from '../components/guest/GuestDiaryList';
import { WelcomeGuide } from '../components/onboarding/WelcomeGuide';
import { OnboardingFlow } from '../components/onboarding/OnboardingFlow';
import { HelpButton } from '../components/help/HelpButton';
import { SubscriptionSuccess } from './SubscriptionSuccess';
import { SubscriptionCancel } from './SubscriptionCancel';
import { supabase } from '../lib/supabase';
import { EN } from '../i18n/en';

export const AppPage: React.FC = () => {
  const [currentView, setCurrentView] = useState('home');
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

  useEffect(() => {
    // アプリを使用したことを記録
    localStorage.setItem('hasUsedApp', 'true');

    // 強制ゲストモードを無効化（普通の動作に戻す）

    // 環境変数が設定されていない場合は即座にゲストモードで開始
    const hasValidConfig = import.meta.env.VITE_SUPABASE_URL && 
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      import.meta.env.VITE_SUPABASE_URL !== 'your_supabase_url' &&
      import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your_supabase_anon_key';

    if (!hasValidConfig) {
      setGuestMode(true);
      setShowOnboarding(true);
      setIsInitialized(true);
      return;
    }

    // URLパラメータをチェック
    const urlParams = new URLSearchParams(window.location.search);
    const isGuestParam = urlParams.get('guest') === 'true';
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
    
    // ゲストパラメータがある場合
    if (isGuestParam) {
      setGuestMode(true);
      setShowOnboarding(true);
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
      initialize().catch(() => {
        setGuestMode(true);
        setShowOnboarding(true);
      }).finally(() => {
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
        <GuestBanner />
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
                  <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          Record Your Diary
                        </h2>
                        <p className="text-sm text-gray-500">Speak in Japanese — AI will give you feedback</p>
                      </div>
                    </div>
                    <VoiceRecorder isGuest />
                  </div>
                  <GuestDiaryList />
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
              <DiaryList />
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

          {currentView === 'practice' && (
            <motion.div
              key="practice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <VersantHome />
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
      </main>
      
      <PWAInstallPrompt />
      <HelpButton />
      <Toaster position="top-center" />
    </div>
  );
};
