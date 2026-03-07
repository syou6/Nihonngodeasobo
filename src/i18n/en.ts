// English text constants for Nihongo de Asobo

export const EN = {
  // App name
  app: {
    name: 'Nihongo de Asobo',
    tagline: 'Learn Japanese Every Day',
  },

  // Navigation
  nav: {
    home: 'Home',
    record: 'Record',
    diary: 'Diary',
    practice: 'Practice',
    settings: 'Settings',
    family: 'Share',
    // Descriptions
    homeDesc: 'Dashboard',
    recordDesc: 'Speak',
    diaryDesc: 'History',
    practiceDesc: 'JLPT',
    settingsDesc: 'Config',
    // Active indicator
    active: 'Active',
  },

  // Dashboard
  dashboard: {
    greeting: {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
    },
    todayPrompt: "Let's record today's diary",
    recordButton: 'Start Recording',
    alreadyRecorded: 'Already recorded today',
    greatJob: 'Great job!',
    viewDiary: 'View Diary',
    practice: 'JLPT Speaking Practice',
    logout: 'Logout',
    logoutConfirm: 'Are you sure you want to logout?',
    // Tips
    tips: {
      title: "Today's Tips",
      tip1: 'What did you do today?',
      tip2: 'How are you feeling?',
      tip3: 'What made you happy?',
    },
  },

  // Recording
  recording: {
    title: 'Record Your Diary',
    instruction: 'Press the microphone button and speak in Japanese about your day',
    recording: 'Recording...',
    stopButton: 'Stop Recording',
    startButton: 'Start Recording',
    pressToStart: 'Press the microphone to start recording',
    whenDone: 'When you\'re done speaking, press the "Stop Recording" button below',
    // After recording
    completed: 'Recording completed!',
    reviewAndSave: 'Review your recording and save it',
    play: 'Play Recording',
    pause: 'Pause',
    save: 'Save Diary',
    discard: 'Re-record',
    // Save dialog
    saveTitle: 'Save Your Diary',
    transcribedText: 'Transcribed Text',
    additionalNotes: 'Additional Notes (Optional)',
    notesPlaceholder: 'e.g., Today I went to the convenience store...',
    saving: 'Saving...',
    saveButton: 'Save',
    back: 'Back',
    // Transcription
    transcribing: 'Transcribing:',
    noTranscription: 'Voice diary (could not transcribe)',
    additionalNotesLabel: 'Additional Notes',
    // Messages
    startSuccess: 'Recording started',
    stopSuccess: 'Recording stopped',
    saveSuccess: 'Diary saved!',
    saveError: 'Failed to save',
    discardSuccess: 'Recording discarded',
    guestLimit: 'Guest limit reached. Please login.',
    guestTimeLimit: 'Guest mode is limited to 30 seconds',
    micPermissionDenied: 'Microphone access denied. Please check your browser settings.',
    notSupported: 'Your browser does not support voice recognition',
    saveTimeout: 'Save timed out. Please try again.',
    noRecordingData: 'No recording data',
  },

  // Diary list
  diary: {
    title: 'My Diary',
    empty: 'No diary entries yet',
    startFirst: 'Record your first diary!',
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete this diary?',
    play: 'Play',
    pause: 'Pause',
  },

  // Auth
  auth: {
    login: 'Login',
    signup: 'Sign Up',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    forgotPassword: 'Forgot Password?',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    loginWithGoogle: 'Continue with Google',
    or: 'or',
  },

  // Guest mode
  guest: {
    banner: 'Guest Mode',
    limit: 'entries remaining',
    tryMode: 'Trial Mode',
    loginPrompt: 'Login to save your diaries',
  },

  // Settings
  settings: {
    title: 'Settings',
    cefrLevel: 'Japanese Level (JLPT)',
    cefrDescription: 'AI feedback will be based on this level',
    notifications: 'Notifications',
    notificationSettings: 'Notification Settings',
    language: 'Language',
    account: 'Account',
    logout: 'Logout',
    apiUsage: 'AI Usage Statistics',
  },

  // JLPT levels
  jlpt: {
    'N5': 'N5 - Beginner',
    'N4': 'N4 - Elementary',
    'N3': 'N3 - Intermediate',
    'N2': 'N2 - Advanced',
    'N1': 'N1 - Proficient',
  },

  // Feedback
  feedback: {
    title: 'AI Feedback',
    loading: 'Analyzing your Japanese...',
    grammar: 'Grammar & Phrasing',
    vocabulary: 'Vocabulary',
    pronunciation: 'Pronunciation Tips',
    reading: 'Recommended Study',
    summary: 'Summary (English)',
    keyVocab: 'Key Vocabulary',
  },

  // JLPT Speaking Practice
  versant: {
    title: 'JLPT Speaking Practice',
    subtitle: 'Practice speaking with JLPT-style exercises',
    partE: {
      title: 'Part E: Summary',
      description: 'Listen to a short passage and summarize it in 30 seconds.',
      descriptionJa: '短い文章を聞いて30秒以内で要約します。',
      instructions: 'Listen to the passage, then summarize the main points in your own words. You have 30 seconds.',
      playButton: 'Play Passage',
      pressPlay: 'Press play to listen to the passage',
      listening: 'Listening...',
      listenTip: 'Pay attention to the main points',
      showPassage: 'Show Passage Text',
      hidePassage: 'Hide Passage Text',
      passageLabel: 'Passage:',
    },
    partF: {
      title: 'Part F: Opinion',
      description: 'Answer a question with your opinion in about 40 seconds.',
      descriptionJa: '質問に対して40秒程度で自分の意見を述べます。',
      instructions: 'Listen to the question, then give your opinion with reasons. You have 40 seconds to respond.',
      playButton: 'Play Question',
      pressPlay: 'Press play to hear the question',
      showQuestion: 'Show Question Text',
      hideQuestion: 'Hide Question Text',
      questionLabel: 'Question:',
    },
    start: 'Start Practice',
    history: 'Practice History',
    viewHistory: 'View Practice History',
    playQuestion: 'Play Question',
    playing: 'Playing...',
    timeLimit: 'Time limit',
    seconds: 'seconds',
    secondsRemaining: 'seconds remaining',
    yourAnswer: 'Your Answer',
    yourResponse: 'Your Response',
    sampleAnswer: 'Sample Answer',
    result: 'Your Result',
    advice: 'Advice',
    nextLevel: 'To reach the next level',
    tryAgain: 'Try Again',
    tryAnother: 'Try Another Question',
    nextQuestion: 'Next Question',
    backToPractice: 'Back to Practice',
    // Recording
    recording: 'Recording...',
    stopRecording: 'Stop Recording',
    yourResponseLabel: 'Your response:',
    analyzing: 'Analyzing your response...',
    // Result
    cefrLevel: 'JLPT Level',
    grammarNotes: 'Grammar Notes',
    vocabularyTips: 'Vocabulary Tips',
    playRecording: 'Play Recording',
    pause: 'Pause',
    noSpeechDetected: '(No speech detected)',
    // Errors
    ttsError: 'Failed to play audio. Starting recording...',
    ttsErrorRetry: 'Failed to play audio. Please try again.',
    processError: 'Failed to process your answer',
    // Tips
    tipsTitle: 'Tips for Success',
    tips: [
      'Listen carefully to the question before you start speaking',
      'Speak clearly and at a natural pace - don\'t rush',
      'Use the full time available - silence is okay while thinking',
      'Practice daily to build confidence and fluency',
    ],
  },

  // User
  user: {
    guest: 'Guest',
    user: 'User',
    admin: 'Admin',
    trialMode: 'Trial Mode',
  },

  // Header
  header: {
    voiceJournal: 'Voice Journal',
    logout: 'Logout',
  },

  // Common
  common: {
    loading: 'Loading...',
    error: 'An error occurred',
    retry: 'Retry',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
  },

  // Errors
  errors: {
    generic: 'Something went wrong. Please try again.',
    network: 'Network error. Please check your connection.',
    auth: 'Authentication failed. Please login again.',
  },

  // Guest mode messages
  guestMode: {
    banner: 'Guest Mode',
    remaining: 'tries remaining',
    loginPrompt: 'Login to save all features',
    createAccount: 'Create Free Account',
    login: 'Login',
    loginSignup: 'Login / Sign Up',
    limitReached: 'Guest limit reached',
    limitMessage: 'Create a free account to continue',
    noDiaries: 'No diary entries yet',
    startRecording: 'Record your first diary entry',
    autoDelete: 'This diary will be auto-deleted in 30 minutes',
    expiresIn: 'Expires in',
    minutes: 'minutes',
    expired: 'Expired',
    deleteConfirm: 'Are you sure you want to delete this diary?',
    deleted: 'Diary deleted',
    healthScore: 'Health Score',
    aiSummary: 'AI Summary',
    play: 'Play',
    stop: 'Stop',
    playAudio: 'Play Audio',
  },

  // Volume indicator
  volume: {
    level: 'Volume Level',
    startRecording: 'Press record to start',
    tooQuiet: 'Too quiet',
    tooLoud: 'Too loud',
    justRight: 'Perfect volume',
    low: 'Low',
    optimal: 'Optimal',
    high: 'High',
  },

  // Share
  share: {
    button: 'Share',
    copied: 'Link copied!',
    copyLink: 'Copy Link',
  },

  // Notifications
  notifications: {
    title: 'Notification Settings',
    premium: 'Premium Plan',
    premiumDesc: 'Get all features for $5/month',
    viewPlans: 'View Plans',
    on: 'Notifications On',
    off: 'Notifications Off',
    types: 'Notification Types',
    newComment: 'New Comments',
    newCommentDesc: 'Get notified when someone comments on your diary',
    familyDiary: 'Student Diary',
    familyDiaryDesc: 'Get notified when your student posts a diary',
    dailyReminder: 'Daily Reminder',
    dailyReminderDesc: 'Get reminded to write your diary',
    reminderTime: 'Reminder Time',
    testNotification: 'Send Test Notification',
    testSent: 'Test notification sent',
    enablePrompt: 'Enable push notifications to receive updates in real-time',
    iosInstruction: 'To enable notifications on iPhone, add this app to your home screen',
    howToAdd: 'How to add:',
    step1: 'Tap the share button at the bottom of Safari',
    step2: 'Select "Add to Home Screen"',
    step3: 'Tap "Add" at the top right',
    step4: 'Open "Nihongo de Asobo" from home screen',
    iosNote: 'Requires iOS 16.4 or later',
    androidTip: 'For smartphone users',
    androidInstructions: 'Use Chrome/Edge browser, Menu → Add to Home Screen',
    enableButton: 'Enable Notifications',
    success: {
      on: 'Notifications enabled',
      off: 'Notifications disabled',
      updated: 'Settings updated',
    },
    error: {
      enable: 'Failed to enable notifications',
      disable: 'Failed to disable notifications',
      update: 'Failed to update settings',
    },
  },

  // Teacher Sharing
  family: {
    title: 'Teacher Connection',
    addRecipient: 'Invite Your Japanese Teacher',
    addDescription: 'Enter your teacher\'s email address to share your diary for feedback',
    addButton: 'Invite',
    yourViewers: 'Your Teacher',
    youCanView: 'Students You Teach',
    remove: 'Remove',
    removeConfirm: 'Are you sure you want to disconnect from this teacher?',
    removed: 'Teacher removed',
    noSharing: 'No teacher connected yet. Invite your teacher to get feedback!',
    noViewers: 'No students connected yet',
    userNotFound: 'Teacher not found. Please check the email address.',
    cannotAddSelf: 'Cannot add yourself',
    alreadyShared: 'Already connected',
    shareSuccess: 'Now connected with',
    addError: 'Failed to connect',
    user: 'User',
  },

  // Subscription
  subscription: {
    title: 'Subscription Management',
    subtitle: 'Your plan and usage',
    currentPlan: 'Current Plan',
    active: 'Active',
    freePlan: 'Free Plan',
    nextRenewal: 'Next renewal',
    cancelScheduled: 'Scheduled to cancel at period end',
    manage: 'Manage Subscription',
    processing: 'Processing...',
    popular: 'Popular',
    perMonth: '/month',
    perYear: '/year',
    selectPlan: 'Select Plan',
    startFree: 'Start Free',
    usage: 'Usage',
    recordings: 'Recordings this month',
    savedDiaries: 'Saved diaries',
    sharedMembers: 'Shared members',
    error: {
      loadStatus: 'Failed to load subscription status',
      checkout: 'Failed to start checkout',
      portal: 'Failed to open management portal',
    },
  },

  // API Usage
  apiUsage: {
    guestMode: 'Guest Mode',
    usage: 'Gemini API Usage',
    simple: 'Simple',
    details: 'Details',
    aiUsage: 'AI Analysis Usage',
    times: 'times',
    status: 'Status',
    used: 'AI analysis used',
    available: 'AI analysis available',
    aiLimitGuest: 'AI analysis limited to 1 use. Please login to continue.',
    todayUsage: 'Today\'s usage',
    remaining: 'Remaining',
    estimatedTokens: 'Estimated tokens',
    estimatedCost: 'Estimated cost',
    limitReached: 'Daily limit reached. Please try again tomorrow.',
    nearLimit: 'Approaching usage limit.',
    resetUsage: 'Reset Usage (Dev)',
  },

  // Dashboard
  parentDashboard: {
    todayDate: 'Today is',
    weather: 'Sunny',
    recordPrompt: 'Record your Japanese diary',
    recordSubPrompt: '1-3 minutes is perfect!',
    topicIdeas: 'Topic ideas:',
    topics: {
      food: 'What you ate today',
      feeling: 'How you\'re feeling',
      activities: 'What made you happy',
    },
    startRecording: 'Start Recording',
    viewDiaries: 'View Past Diaries',
    viewDiariesDesc: 'Review your diary history',
    viewDiaryButton: 'View Diary',
    todaySummary: 'Today\'s Summary',
    speakingScore: 'Speaking Score',
    todayMood: 'Today\'s Mood',
    familyComments: "Teacher's Comments",
    familyMessages: "Teacher's Messages",
    noMessages: 'No messages from your teacher yet',
    sharePrompt: 'Connect with your teacher to get feedback',
    viewAllComments: 'View All Diaries & Comments',
  },

  // Onboarding/Welcome
  onboarding: {
    steps: [
      {
        title: 'Practice Japanese Every Day',
        description: 'Record a short diary in Japanese each day. Just 1-3 minutes of speaking practice helps you improve naturally.',
        benefit: 'Build a daily Japanese habit'
      },
      {
        title: 'Just Speak - No Typing Required',
        description: 'Press record and speak about your day in Japanese. The app transcribes your speech automatically.',
        benefit: 'Perfect for busy learners'
      },
      {
        title: 'Get AI Feedback',
        description: 'Receive personalized feedback on your grammar, vocabulary, and pronunciation from AI — tailored to your JLPT level.',
        benefit: 'Learn from your mistakes'
      },
      {
        title: 'Track Your Progress',
        description: 'Review past entries, see your JLPT level progress, and practice with JLPT Speaking Practice questions.',
        benefit: 'Measure your improvement'
      }
    ],
    previous: 'Previous',
    next: 'Next',
    start: 'Get Started',
    skip: 'Skip',
  },

  // Help
  help: {
    title: 'Help',
    subtitle: 'How to use guide',
    home: {
      title: 'Home Screen',
      description: 'Record and view your diary entries',
      tips: [
        'Press the large record button to start recording',
        'Scroll down to see your recent diary entries',
        'Tap a diary entry to see details and AI feedback'
      ]
    },
    recording: {
      title: 'Recording Screen',
      description: 'Record your voice diary in Japanese',
      tips: [
        'Press the record button to start',
        'Speak in Japanese for 1-3 minutes',
        'The volume meter shows if your voice is clear',
        'Review and save your recording when done'
      ]
    },
    diary: {
      title: 'Diary List',
      description: 'View your past diary entries',
      tips: [
        'Tap a diary to see full details',
        'Press play to listen to your recording',
        'View AI feedback for grammar and vocabulary'
      ]
    },
    settings: {
      title: 'Settings',
      description: 'Configure your preferences',
      tips: [
        'Set your Japanese level (JLPT)',
        'Manage notifications',
        'View your account details'
      ]
    },
    faq: {
      title: 'FAQ',
      q1: "Recording doesn't work?",
      q2: 'How to connect with my teacher?',
      q3: 'How to recover deleted diary?',
    },
    support: {
      title: "Need more help?",
      description: 'Contact our support team',
      button: 'Contact Support',
    },
  },

  // PWA Install
  pwa: {
    useAsApp: 'Use as App',
    install: 'Install App',
    installDescription: 'Add Nihongo de Asobo to your home screen for the best experience. You\'ll also receive push notifications.',
    iosInstructions: 'Add to home screen to enable push notifications',
    step1: 'Tap the share button below',
    step2: 'Select "Add to Home Screen"',
    step3: 'Tap "Add" at the top right',
    installButton: 'Install',
    later: 'Later',
  },

  // Pricing
  pricing: {
    popular: 'Most Popular',
    currentPlan: 'Current Plan',
    freePlan: 'Free Plan',
    processing: 'Processing...',
    startNow: 'Start Now',
    managePlan: 'Manage Plan',
    loginRequired: 'Please login first',
    notAvailable: 'This plan is not available',
    error: 'An error occurred. Please try again.',
  },

  // Dialog defaults
  dialog: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    processing: 'Processing...',
    confirmation: 'Confirmation',
    areYouSure: 'Are you sure?',
    execute: 'OK',
    close: 'Close',
    showMore: 'Show more',
  },

  // Subscription pages
  subscriptionPage: {
    back: 'Back',
    selectPlan: 'Choose a Plan',
    chooseDescription: 'Select the plan that fits you best',
    campaign: 'Limited Time Offer',
    campaignDesc: 'Try Premium free for 30 days!',
    securePayment: 'Secure Payment',
    instantUpgrade: 'Instant Upgrade',
    faq: 'FAQ',
    faqCancelQ: 'Can I cancel anytime?',
    faqCancelA: 'Yes, you can cancel anytime. Service continues until the end of billing period.',
    faqPaymentQ: 'What payment methods are accepted?',
    faqPaymentA: 'We accept Visa, Mastercard, American Express, and JCB credit cards.',
    faqChangeQ: 'Can I change plans?',
    faqChangeA: 'Yes, you can upgrade or downgrade anytime. Charges are prorated.',
    sslEncrypted: 'SSL Encrypted',
    poweredBy: 'Powered by',
  },

  // Subscription success/cancel
  subscriptionResult: {
    successTitle: 'Subscription Started!',
    successMessage: 'Thank you for subscribing. You now have access to premium features.',
    startApp: 'Start App',
    manageSubscription: 'Manage Subscription',
    premiumActivated: 'Premium features activated. Unlimited recordings, AI analysis, and family sharing are now available.',
    cancelTitle: 'Subscription Cancelled',
    cancelMessage: 'Your subscription has been cancelled. You can resubscribe anytime.',
    backToApp: 'Back to App',
    reviewPlans: 'Review Plans',
    freeFeatures: 'You can still use basic features on the free plan. Recording limits apply.',
  },
} as const;

export type TranslationKey = keyof typeof EN;
