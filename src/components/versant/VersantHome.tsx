import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, MessageSquare, Mic, History, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { PartEPractice } from './PartEPractice';
import { PartFPractice } from './PartFPractice';
import { TestHistory } from './TestHistory';
import { EN } from '../../i18n/en';
import { VERSANT } from '../../lib/constants';

type ViewMode = 'home' | 'partE' | 'partF' | 'history';

export const VersantHome: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('home');

  if (viewMode === 'partE') {
    return <PartEPractice onBack={() => setViewMode('home')} />;
  }

  if (viewMode === 'partF') {
    return <PartFPractice onBack={() => setViewMode('home')} />;
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
            onClick={() => setViewMode('partE')}
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
                {VERSANT.PART_E.TIME_LIMIT} {EN.versant.seconds}
              </span>
            </div>
          </motion.div>

          {/* Part F Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl p-6 border-2 border-purple-200 cursor-pointer"
            onClick={() => setViewMode('partF')}
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
                {VERSANT.PART_F.TIME_LIMIT} {EN.versant.seconds}
              </span>
            </div>
          </motion.div>
        </div>

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
