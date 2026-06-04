import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, MessageSquare, Mic, History, ChevronRight, Crown, AlertCircle, AudioLines } from 'lucide-react';
import { Button } from '../ui/Button';
import { PartEPractice } from './PartEPractice';
import { PartFPractice } from './PartFPractice';
import { TestHistory } from './TestHistory';
import { PitchPractice } from '../pitch/PitchPractice';
import { EN } from '../../i18n/en';
import { PRACTICE } from '../../lib/constants';
import { useSubscription } from '../../hooks/useSubscription';
import toast from 'react-hot-toast';

type ViewMode = 'home' | 'partE' | 'partF' | 'history' | 'pitch';

interface VersantHomeProps {
  onViewChange?: (view: string) => void;
}

export const VersantHome: React.FC<VersantHomeProps> = ({ onViewChange }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [showPostSessionUpsell, setShowPostSessionUpsell] = useState(false);
  const { checkAction, isPremium, usage, limits } = useSubscription();

  const handleStartPractice = async (part: 'partE' | 'partF') => {
    const canPractice = await checkAction('speaking_practice');
    if (!canPractice.allowed) {
      toast.error('Daily practice limit reached. Upgrade to Premium for unlimited practice.');
      return;
    }
    setViewMode(part);
  };

  const handleBackFromPractice = () => {
    setViewMode('home');
    if (!isPremium) {
      setShowPostSessionUpsell(true);
    }
  };

  if (viewMode === 'partE') {
    return <PartEPractice onBack={handleBackFromPractice} />;
  }

  if (viewMode === 'partF') {
    return <PartFPractice onBack={handleBackFromPractice} />;
  }

  if (viewMode === 'pitch') {
    return <PitchPractice onBack={() => setViewMode('home')} />;
  }

  if (viewMode === 'history') {
    return <TestHistory onBack={() => setViewMode('home')} />;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Post-session upsell */}
        {showPostSessionUpsell && !isPremium && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-brand-500 to-purple-600 rounded-2xl p-5 text-white mb-2"
          >
            <div className="flex items-start gap-3">
              <Crown className="w-6 h-6 text-amber-300 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">Great practice session!</h3>
                <p className="text-sm text-white/85 mb-3">
                  Want unlimited JLPT speaking practice every day? Upgrade to Premium and never hit a limit again.
                </p>
                <div className="flex gap-2">
                  {onViewChange && (
                    <button
                      onClick={() => { setShowPostSessionUpsell(false); onViewChange('pricing'); }}
                      className="px-4 py-2 bg-white text-brand-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Upgrade to Premium →
                    </button>
                  )}
                  <button
                    onClick={() => setShowPostSessionUpsell(false)}
                    className="px-4 py-2 bg-white/20 text-white text-sm font-medium rounded-xl hover:bg-white/30 transition-colors"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Free practice limit banner */}
        {!isPremium && !showPostSessionUpsell && limits.speakingPracticeLimit !== Infinity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border mb-2 ${
              usage.speakingPracticeCount >= (limits.speakingPracticeLimit as number)
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className={`w-4 h-4 flex-shrink-0 ${usage.speakingPracticeCount >= (limits.speakingPracticeLimit as number) ? 'text-red-500' : 'text-amber-600'}`} />
              <span className={`text-sm font-semibold ${usage.speakingPracticeCount >= (limits.speakingPracticeLimit as number) ? 'text-red-700' : 'text-amber-800'}`}>
                {usage.speakingPracticeCount >= (limits.speakingPracticeLimit as number)
                  ? 'Daily practice limit reached'
                  : `${limits.speakingPracticeLimit} free practice/day — ${(limits.speakingPracticeLimit as number) - usage.speakingPracticeCount} remaining`}
              </span>
            </div>
            {onViewChange && (
              <button
                onClick={() => onViewChange('pricing')}
                className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 flex-shrink-0"
              >
                <Crown className="w-3 h-3" />
                Upgrade
              </button>
            )}
          </motion.div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            {EN.nav.practice}
          </h1>
          <p className="text-lg text-gray-600">
            {EN.versant.subtitle}
          </p>
        </div>

        {/* Practice Options */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Part E Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 border-2 border-indigo-200 cursor-pointer"
            onClick={() => handleStartPractice('partE')}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-indigo-500 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <ChevronRight className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {EN.versant.partE.title}
            </h3>
            <p className="text-gray-600 mb-4">
              {EN.versant.partE.description}
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="px-3 py-1 bg-indigo-200 text-indigo-800 rounded-full font-medium">
                {PRACTICE.PART_E.TIME_LIMIT} {EN.versant.seconds}
              </span>
            </div>
          </motion.div>

          {/* Part F Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl p-6 border-2 border-purple-200 cursor-pointer"
            onClick={() => handleStartPractice('partF')}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-purple-500 rounded-xl flex items-center justify-center">
                <Mic className="w-7 h-7 text-white" />
              </div>
              <ChevronRight className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {EN.versant.partF.title}
            </h3>
            <p className="text-gray-600 mb-4">
              {EN.versant.partF.description}
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="px-3 py-1 bg-purple-200 text-purple-800 rounded-full font-medium">
                {PRACTICE.PART_F.TIME_LIMIT} {EN.versant.seconds}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Pitch Accent Card — free, runs fully on-device (no usage limit) */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-6 bg-gradient-to-br from-emerald-50 to-teal-100 rounded-2xl p-6 border-2 border-emerald-200 cursor-pointer"
          onClick={() => setViewMode('pitch')}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <AudioLines className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-2xl font-bold text-gray-900">Pitch Accent</h3>
                <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full">
                  FREE
                </span>
              </div>
              <p className="text-gray-600">
                Say a word and get instant pitch-accent scoring — see your pitch vs the standard Tokyo pattern.
              </p>
            </div>
            <ChevronRight className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          </div>
        </motion.div>

        {/* History Button */}
        <div className="mt-8">
          <Button
            onClick={() => setViewMode('history')}
            variant="outline"
            size="lg"
            className="w-full"
          >
            <History className="w-5 h-5 mr-2" />
            {EN.versant.viewHistory}
          </Button>
        </div>

        {/* Tips Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-yellow-50 rounded-2xl p-6 border border-yellow-200"
        >
          <h3 className="text-lg font-bold text-yellow-800 mb-3">
            {EN.versant.tipsTitle}
          </h3>
          <ul className="space-y-2 text-yellow-700">
            {EN.versant.tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="font-bold">{index + 1}.</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.div>
    </div>
  );
};
