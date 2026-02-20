import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  RotateCcw,
  Home,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Lightbulb,
  BookOpen
} from 'lucide-react';
import { Button } from '../ui/Button';
import { EN } from '../../i18n/en';
import { getScoreColor, getCefrColor } from '../../lib/constants';
import type { VersantAnswer } from '../../stores/versantStore';

interface ResultDisplayProps {
  answer: VersantAnswer;
  onTryAnother: () => void;
  onBack: () => void;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  answer,
  onTryAnother,
  onBack
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [showGrammar, setShowGrammar] = useState(true);
  const [showVocabulary, setShowVocabulary] = useState(false);
  const [showSample, setShowSample] = useState(false);

  const handlePlayPause = () => {
    if (!answer.audioUrl) return;

    if (isPlaying && audioElement) {
      audioElement.pause();
      setIsPlaying(false);
    } else if (audioElement) {
      audioElement.play();
      setIsPlaying(true);
    } else {
      const audio = new Audio(answer.audioUrl);
      audio.onended = () => setIsPlaying(false);
      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Score Header */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Award className="w-8 h-8 text-indigo-600" />
          <h2 className="text-2xl font-bold text-gray-900">{EN.versant.result}</h2>
        </div>

        {answer.feedback && (
          <div className="flex items-center justify-center gap-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${getScoreColor(answer.feedback.score)}`}>
              <span className="text-3xl font-bold">{answer.feedback.score}</span>
            </div>
            <div className="text-left">
              <p className="text-gray-600 text-sm">{EN.versant.cefrLevel}</p>
              <span className={`inline-block px-3 py-1 rounded-full text-lg font-bold ${getCefrColor(answer.feedback.cefrLevel)}`}>
                {answer.feedback.cefrLevel}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Your Response */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3">{EN.versant.yourResponse}</h3>

        {answer.audioUrl && (
          <Button
            onClick={handlePlayPause}
            variant="outline"
            size="sm"
            className="mb-4"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                {EN.versant.pause}
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                {EN.versant.playRecording}
              </>
            )}
          </Button>
        )}

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-800">
            {answer.transcribedText || EN.versant.noSpeechDetected}
          </p>
        </div>
      </div>

      {/* Feedback Sections */}
      {answer.feedback && (
        <>
          {/* Advice */}
          <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-200">
            <p className="text-indigo-800 text-lg">{answer.feedback.advice}</p>
          </div>

          {/* Grammar Notes */}
          {answer.feedback.grammarNotes && answer.feedback.grammarNotes.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowGrammar(!showGrammar)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-gray-900">{EN.versant.grammarNotes}</span>
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                    {answer.feedback.grammarNotes.length}
                  </span>
                </div>
                {showGrammar ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {showGrammar && (
                <div className="border-t border-gray-100 p-4 space-y-2">
                  {answer.feedback.grammarNotes.map((note, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 text-gray-700">
                      {note}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vocabulary Tips */}
          {answer.feedback.vocabularyTips && answer.feedback.vocabularyTips.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowVocabulary(!showVocabulary)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  <span className="font-semibold text-gray-900">{EN.versant.vocabularyTips}</span>
                  <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                    {answer.feedback.vocabularyTips.length}
                  </span>
                </div>
                {showVocabulary ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {showVocabulary && (
                <div className="border-t border-gray-100 p-4 space-y-2">
                  {answer.feedback.vocabularyTips.map((tip, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 text-gray-700">
                      {tip}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sample Answer */}
          {answer.feedback.sampleAnswer && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowSample(!showSample)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-green-500" />
                  <span className="font-semibold text-gray-900">{EN.versant.sampleAnswer}</span>
                </div>
                {showSample ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {showSample && (
                <div className="border-t border-gray-100 p-4">
                  <p className="text-gray-700 italic">{answer.feedback.sampleAnswer}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={onTryAnother}
          variant="primary"
          size="lg"
          className="flex-1"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          {EN.versant.tryAnother}
        </Button>
        <Button
          onClick={onBack}
          variant="outline"
          size="lg"
          className="flex-1"
        >
          <Home className="w-5 h-5 mr-2" />
          {EN.versant.backToPractice}
        </Button>
      </div>
    </motion.div>
  );
};
