import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Mic, MessageSquare } from 'lucide-react';
import { EN } from '../../i18n/en';

export const PracticePlaceholder: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="mb-8">
          <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-12 h-12 text-indigo-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {EN.nav.practice}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Practice speaking Japanese with JLPT-style exercises.
            Improve your fluency and test preparation.
          </p>
        </div>

        {/* Coming Soon Cards */}
        <div className="grid md:grid-cols-2 gap-6 mt-12">
          {/* Part E: Summary */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-indigo-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-gray-900">
                  {EN.versant.partE.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {EN.versant.partE.subtitle}
                </p>
              </div>
            </div>
            <p className="text-gray-700 text-left mb-4">
              {EN.versant.partE.description}
            </p>
            <div className="flex items-center gap-2 text-indigo-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">30 seconds to respond</span>
            </div>
            <div className="mt-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
              Coming Soon
            </div>
          </motion.div>

          {/* Part F: Opinion */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-gray-900">
                  {EN.versant.partF.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {EN.versant.partF.subtitle}
                </p>
              </div>
            </div>
            <p className="text-gray-700 text-left mb-4">
              {EN.versant.partF.description}
            </p>
            <div className="flex items-center gap-2 text-purple-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">40 seconds to respond</span>
            </div>
            <div className="mt-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
              Coming Soon
            </div>
          </motion.div>
        </div>

        {/* Tips Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 bg-gray-50 rounded-2xl p-6"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            While you wait, try these tips:
          </h3>
          <ul className="text-left text-gray-700 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 font-bold">1.</span>
              <span>Record daily diary entries to build speaking confidence</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 font-bold">2.</span>
              <span>Review AI feedback to improve grammar and vocabulary</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 font-bold">3.</span>
              <span>Aim to speak for at least 1 minute every day</span>
            </li>
          </ul>
        </motion.div>
      </motion.div>
    </div>
  );
};
