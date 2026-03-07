import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { LogoWithText } from '../ui/Logo';
import {
  Mic,
  Brain,
  TrendingUp,
  ChevronRight,
  BookOpen,
  Sparkles
} from 'lucide-react';

interface WelcomeGuideProps {
  onComplete: (selectedLevel?: string) => void;
  show?: boolean;
}

const JLPT_LEVELS = [
  { id: 'N5', label: 'N5 - Beginner', description: 'I know basic greetings and simple phrases', example: 'わたしは がくせい です' },
  { id: 'N4', label: 'N4 - Elementary', description: 'I can have simple everyday conversations', example: 'きのう ともだちと えいがを みました' },
  { id: 'N3', label: 'N3 - Intermediate', description: 'I can understand everyday Japanese', example: '来週の会議について相談したいんですが' },
  { id: 'N2', label: 'N2 - Advanced', description: 'I can read newspapers and have discussions', example: '経済状況を踏まえた上で検討する必要がある' },
  { id: 'N1', label: 'N1 - Proficient', description: 'I can understand complex Japanese', example: '彼の主張は一見もっともらしいが、根拠に乏しい' },
];

const steps = [
  {
    icon: Mic,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    title: 'Record a Voice Diary',
    description: 'Tap the mic and talk about your day in Japanese. Just 1-2 minutes is enough!',
    visual: 'record',
  },
  {
    icon: Brain,
    iconBg: 'bg-brand-50',
    iconColor: 'text-brand-600',
    title: 'AI Tells You Why & How to Fix',
    description: 'Not just "wrong" — you get detailed grammar corrections, natural expressions, and a sample answer.',
    visual: 'feedback',
  },
  {
    icon: TrendingUp,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-500',
    title: 'Level Up Your Japanese',
    description: 'Track your JLPT level progress, practice speaking exercises, and share with your teacher.',
    visual: 'progress',
  },
];

export const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ onComplete, show = true }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const totalSteps = steps.length + 1;
  const isLevelStep = currentStep === steps.length;

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem('onboardingCompleted', 'true');
      onComplete(selectedLevel || 'N4');
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    onComplete(selectedLevel || 'N4');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Progress bar */}
      <div className="flex gap-1.5 px-6 pt-4">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= currentStep ? 'bg-brand-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Skip button */}
      <div className="flex justify-end px-6 pt-2">
        <button
          onClick={handleSkip}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-8">
        <AnimatePresence mode="wait">
          {!isLevelStep ? (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="max-w-md w-full text-center"
            >
              {currentStep === 0 && (
                <div className="mb-8">
                  <LogoWithText size="lg" />
                </div>
              )}

              <div className={`w-16 h-16 ${steps[currentStep].iconBg} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                {React.createElement(steps[currentStep].icon, {
                  className: `w-8 h-8 ${steps[currentStep].iconColor}`,
                })}
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {steps[currentStep].title}
              </h2>

              <p className="text-gray-600 text-base leading-relaxed mb-8">
                {steps[currentStep].description}
              </p>

              {/* Step 1: Example topics */}
              {currentStep === 0 && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                  <p className="text-sm text-gray-500 mb-3">Talk about anything:</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">☕</span>
                      <span className="text-sm text-gray-700">きょう カフェに いきました</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎬</span>
                      <span className="text-sm text-gray-700">にほんの えいがを みました</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🍜</span>
                      <span className="text-sm text-gray-700">ラーメンを つくりました</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: AI feedback example */}
              {currentStep === 1 && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-1">You said:</p>
                    <p className="text-sm text-gray-700">友達<span className="text-red-500 line-through font-medium">に</span>会いました</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-600 uppercase mb-1">AI correction:</p>
                    <p className="text-sm text-gray-700">友達<span className="text-green-600 font-bold">と</span>会いました</p>
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <p className="text-xs text-gray-500">
                      <strong>Why:</strong> Use と (to) for mutual actions like meeting. に (ni) is for one-directional actions.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Progress visual */}
              {currentStep === 2 && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-around">
                    <div className="text-center">
                      <div className="text-2xl font-black text-brand-600">N4</div>
                      <div className="text-xs text-gray-500">JLPT Level</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-green-600">78%</div>
                      <div className="text-xs text-gray-500">Grammar</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-purple-600">12</div>
                      <div className="text-xs text-gray-500">Day Streak</div>
                    </div>
                  </div>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                onClick={handleNext}
                className="w-full"
              >
                {currentStep === 0 ? "Let's Go" : 'Next'}
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="level-select"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="max-w-md w-full"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-brand-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  What's your Japanese level?
                </h2>
                <p className="text-gray-600 text-sm">
                  We'll tailor feedback to your level. You can change it anytime in Settings.
                </p>
              </div>

              <div className="space-y-2 mb-6">
                {JLPT_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setSelectedLevel(level.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      selectedLevel === level.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`font-semibold text-sm ${
                          selectedLevel === level.id ? 'text-brand-700' : 'text-gray-900'
                        }`}>
                          {level.label}
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">{level.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">{level.example}</p>
                      </div>
                      {selectedLevel === level.id && (
                        <div className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleNext}
                className="w-full"
              >
                <Sparkles className="w-5 h-5 mr-1" />
                Start Learning
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
