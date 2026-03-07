import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Check, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { JLPTLevel } from '../../types';
import { EN } from '../../i18n/en';

interface CEFRSettingsProps {
  currentLevel: JLPTLevel;
  onLevelChange: (level: JLPTLevel) => void;
}

const jlptLevels: { level: JLPTLevel; description: string; color: string }[] = [
  { level: 'N5', description: EN.jlpt['N5'], color: 'bg-gray-100 border-gray-300 text-gray-700' },
  { level: 'N4', description: EN.jlpt['N4'], color: 'bg-blue-100 border-blue-300 text-blue-700' },
  { level: 'N3', description: EN.jlpt['N3'], color: 'bg-green-100 border-green-300 text-green-700' },
  { level: 'N2', description: EN.jlpt['N2'], color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
  { level: 'N1', description: EN.jlpt['N1'], color: 'bg-purple-100 border-purple-300 text-purple-700' },
];

export const CEFRSettings: React.FC<CEFRSettingsProps> = ({ currentLevel, onLevelChange }) => {
  const [showLevelChart, setShowLevelChart] = useState(false);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Your Japanese Level</h3>
          <p className="text-gray-600">Select your current JLPT level for personalized feedback</p>
        </div>
      </div>

      <div className="grid gap-2">
        {jlptLevels.map(({ level, description, color }) => {
          const isSelected = currentLevel === level;
          return (
            <motion.button
              key={level}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onLevelChange(level)}
              className={`relative flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-lg font-bold text-sm ${color}`}>
                  {level}
                </span>
                <span className="text-gray-700 text-sm">{description}</span>
              </div>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* JLPT Level Reference */}
      <div className="mt-6 border border-blue-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowLevelChart(!showLevelChart)}
          className="w-full px-4 py-3 bg-blue-50 flex items-center justify-between hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-800">About JLPT Levels</span>
          </div>
          {showLevelChart ? (
            <ChevronUp className="w-5 h-5 text-blue-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-blue-600" />
          )}
        </button>
        <AnimatePresence>
          {showLevelChart && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-blue-200"
            >
              <div className="p-4 bg-white text-sm text-gray-600">
                <p className="font-medium mb-2">JLPT Level Guide:</p>
                <ul className="space-y-1">
                  <li><span className="font-semibold text-gray-700">N5</span> - Basic hiragana, katakana, ~100 kanji. Simple daily phrases.</li>
                  <li><span className="font-semibold text-blue-700">N4</span> - ~300 kanji. Basic grammar for everyday conversations.</li>
                  <li><span className="font-semibold text-green-700">N3</span> - ~650 kanji. Everyday situations and simple written Japanese.</li>
                  <li><span className="font-semibold text-yellow-700">N2</span> - ~1000 kanji. Broad range of topics and complex Japanese.</li>
                  <li><span className="font-semibold text-purple-700">N1</span> - ~2000 kanji. Complex Japanese in any context.</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
