import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { useGuestStore } from '../stores/guestStore';
import { AuthForm } from '../components/auth/AuthForm';
import { Header } from '../components/navigation/Header';
import { ParentDashboard } from '../components/dashboard/ParentDashboard';
import { VoiceRecorder } from '../components/recording/VoiceRecorder';
import { DiaryList } from '../components/diary/DiaryList';
import { FamilyManager } from '../components/family/FamilyManager';
import { NotificationSettings } from '../components/settings/NotificationSettings';
import { SettingsView } from '../components/settings/SettingsView';
import { SubscriptionManager } from '../components/subscription/SubscriptionManager';
import { VersantHome } from '../components/versant/VersantHome';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';
import { GuestBanner } from '../components/guest/GuestBanner';
import { GuestDiaryList } from '../components/guest/GuestDiaryList';
import { WelcomeGuide } from '../components/onboarding/WelcomeGuide';
import { HelpButton } from '../components/help/HelpButton';
import { supabase } from '../lib/supabase';
import { EN } from '../i18n/en';

export const AppPage: React.FC = () => {
  const [currentView, setCurrentView] = useState('home');
  const [showOnboarding, setShowOnboarding] = useState(false);
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
  const { user, loading, initialize } = useAuthStore();
  const { isGuestMode, cleanExpiredDiaries, setGuestMode } = useGuestStore();

  useEffect(() => {
    console.log('AppPage初期化開始');
    
    // アプリを使用したことを記録
    localStorage.setItem('hasUsedApp', 'true');

    // 強制ゲストモードを無効化（普通の動作に戻す）

    // 環境変数が設定されていない場合は即座にゲストモードで開始
    const hasValidConfig = import.meta.env.VITE_SUPABASE_URL && 
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      import.meta.env.VITE_SUPABASE_URL !== 'your_supabase_url' &&
      import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your_supabase_anon_key';

    console.log('hasValidConfig:', hasValidConfig);

    if (!hasValidConfig) {
      console.log('環境変数が未設定のため、ゲストモードで開始します');
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
    
    // デバッグ情報
    console.log('AppPage.tsx - URL params:', {
      pathname: window.location.pathname,
      search: window.location.search,
      isGuestParam,
      isSignupParam,
      isLoginParam,
      viewParam
    });
    
    // サインアップパラメータがある場合
    if (isSignupParam) {
      sessionStorage.setItem('showAuthForm', 'true');
      sessionStorage.setItem('showSignupForm', 'true');
      setGuestMode(false);
      // URLからパラメータを削除
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('signup');
      window.history.replaceState({}, '', newUrl.toString());
      console.log('AppPage.tsx - Signup param detected, showing signup form');
      return;
    }
    
    // ログインパラメータがある場合
    if (isLoginParam) {
      sessionStorage.setItem('showAuthForm', 'true');
      sessionStorage.removeItem('showSignupForm');
      setGuestMode(false);
      // URLからパラメータを削除
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('login');
      window.history.replaceState({}, '', newUrl.toString());
      console.log('AppPage.tsx - Login param detected, showing login form');
      return;
    }
    
    // ゲストパラメータがある場合
    if (isGuestParam) {
      setGuestMode(true);
      setShowOnboarding(true);
      // URLからパラメータを削除
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('guest');
      window.history.replaceState({}, '', newUrl.toString());
      console.log('AppPage.tsx - Guest param detected, enabling guest mode');
      return;
    }
    
    // ビューパラメータがあれば設定
    if (viewParam) {
      setCurrentView(viewParam);
    }
    
    // 認証フォーム表示フラグをチェック（最優先）
    const showAuthForm = sessionStorage.getItem('showAuthForm') === 'true';
    if (showAuthForm) {
      setGuestMode(false);
      sessionStorage.removeItem('showAuthForm');
      console.log('AppPage.tsx - Auth form flag detected, showing auth form');
      setIsInitialized(true);
      return;
    }
    
    // 環境変数が設定されている場合は認証を試行
    if (hasValidConfig) {
      console.log('AppPage.tsx - Valid config found, initializing auth');
      initialize().catch((error) => {
        console.error('認証初期化エラー:', error);
        console.log('AppPage.tsx - Auth init failed, falling back to guest mode');
        setGuestMode(true);
        setShowOnboarding(true);
      }).finally(() => {
        setIsInitialized(true);
      });
    } else {
      // 環境変数が未設定の場合はゲストモードで開始
      console.log('AppPage.tsx - No valid config, starting guest mode');
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
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

  // Loading state
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{EN.common.loading}</p>
        </div>
      </div>
    );
  }

  // 認証フォーム表示
  const showAuthForm = sessionStorage.getItem('showAuthForm') === 'true';
  
  if (showAuthForm || (!user && !isGuestMode)) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AuthForm />
        <Toaster position="top-center" />
      </div>
    );
  }

  // ゲストモード
  if (isGuestMode && !user) {
    return (
      <div className="min-h-screen bg-gray-100">
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
                <WelcomeGuide onComplete={() => setShowOnboarding(false)} />
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Record Your Diary
                    </h2>
                    <VoiceRecorder />
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

  // メインアプリ
  return (
    <div className="min-h-screen bg-gray-100">
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
              <ParentDashboard onViewChange={setCurrentView} />
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
          
          {currentView === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <NotificationSettings />
            </motion.div>
          )}
          
          {/* Subscription view hidden for now */}

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
