import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Mic, MicOff, Volume2, RotateCcw, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { ResultDisplay } from './ResultDisplay';
import { useVersantStore } from '../../stores/versantStore';
import { getRandomQuestion, getQuestionsByPart, type CEFRLevel } from '../../lib/versant-questions';
import { supabase } from '../../lib/supabase';
import { tts } from '../../lib/tts';
import { VoiceTranscriber } from '../../lib/speechRecognition';
import { EN } from '../../i18n/en';
import toast from 'react-hot-toast';

interface PartEPracticeProps {
  onBack: () => void;
}

type PracticeState = 'ready' | 'listening' | 'recording' | 'processing' | 'result';

export const PartEPractice: React.FC<PartEPracticeProps> = ({ onBack }) => {
  const [state, setState] = useState<PracticeState>('ready');
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [transcribedText, setTranscribedText] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPassage, setShowPassage] = useState(false);

  const transcriberRef = useRef<VoiceTranscriber | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { currentQuestion, setCurrentQuestion, saveAnswer, loading } = useVersantStore();

  useEffect(() => {
    // Get user's CEFR level and select a matching Part E question
    const loadQuestion = async () => {
      let cefrLevel: CEFRLevel = 'B1';
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('cefr_level')
            .eq('id', user.id)
            .single();
          cefrLevel = profile?.cefr_level || 'B1';
        }
      } catch (e) {
        // Use default B1
      }
      const question = getRandomQuestion('E', cefrLevel);
      setCurrentQuestion(question);
    };
    loadQuestion();

    return () => {
      tts.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (transcriberRef.current) transcriberRef.current.abort();
    };
  }, []);

  const playQuestion = async () => {
    if (!currentQuestion) return;

    setIsPlaying(true);
    setState('listening');

    try {
      await tts.speak(currentQuestion.text, { rate: 0.85 });
      setIsPlaying(false);
      // Small delay before recording starts
      setTimeout(() => {
        startRecording();
      }, 1000);
    } catch (error) {
      console.error('TTS error:', error);
      setIsPlaying(false);
      toast.error('Failed to play audio. Please try again.');
      setState('ready');
    }
  };

  const startRecording = async () => {
    if (!currentQuestion) return;

    setState('recording');
    setTimeRemaining(currentQuestion.timeLimit);
    setTranscribedText('');
    audioChunksRef.current = [];

    // Start audio recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
    } catch (error) {
      console.error('Failed to start audio recording:', error);
    }

    // Start speech recognition
    if (VoiceTranscriber.isSupported()) {
      transcriberRef.current = new VoiceTranscriber();
      transcriberRef.current.start(
        (text) => {
          setTranscribedText(text);
        },
        (error) => {
          console.error('Speech recognition error:', error);
        }
      );
    }

    // Start countdown timer
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = async () => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop speech recognition
    let finalText = transcribedText;
    if (transcriberRef.current) {
      finalText = transcriberRef.current.stop();
      setTranscribedText(finalText);
    }

    // Stop audio recording
    let audioBlob: Blob | undefined;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      await new Promise<void>(resolve => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = () => {
            audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            resolve();
          };
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        } else {
          resolve();
        }
      });
    }

    setState('processing');

    // Save and get feedback
    if (currentQuestion) {
      try {
        const answer = await saveAnswer(currentQuestion.id, finalText, audioBlob);
        setCurrentAnswer(answer);
        setState('result');
      } catch (error) {
        console.error('Failed to save answer:', error);
        toast.error('Failed to process your answer');
        setState('ready');
      }
    }
  };

  const tryAnother = async () => {
    let cefrLevel: CEFRLevel = 'B1';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('cefr_level')
          .eq('id', user.id)
          .single();
        cefrLevel = profile?.cefr_level || 'B1';
      }
    } catch (e) {
      // Use default B1
    }
    const question = getRandomQuestion('E', cefrLevel);
    setCurrentQuestion(question);
    setCurrentAnswer(null);
    setTranscribedText('');
    setShowPassage(false);
    setState('ready');
  };

  if (!currentQuestion) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{EN.versant.partE.title}</h1>
          <p className="text-gray-600">{EN.versant.partE.subtitle}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {state === 'result' && currentAnswer ? (
          <ResultDisplay
            key="result"
            answer={currentAnswer}
            onTryAnother={tryAnother}
            onBack={onBack}
          />
        ) : (
          <motion.div
            key="practice"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Instructions */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-blue-800">
                <strong>Instructions:</strong> Listen to the passage, then summarize
                the main points in your own words. You have 30 seconds.
              </p>
            </div>

            {/* Collapsible Passage Text */}
            <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowPassage(!showPassage)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {showPassage ? (
                    <EyeOff className="w-5 h-5 text-gray-500" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-500" />
                  )}
                  <span className="font-medium text-gray-700">
                    {showPassage ? 'Hide Passage Text' : 'Show Passage Text'}
                  </span>
                </div>
                {showPassage ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              <AnimatePresence>
                {showPassage && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-200"
                  >
                    <div className="p-4 bg-blue-50">
                      <p className="text-sm text-blue-600 font-medium mb-1">Passage:</p>
                      <p className="text-lg text-gray-800 leading-relaxed">{currentQuestion.text}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Question Card */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
              {state === 'ready' && (
                <div className="text-center">
                  <p className="text-gray-600 mb-6">
                    Press play to listen to the passage
                  </p>
                  <Button
                    onClick={playQuestion}
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    <Play className="w-6 h-6 mr-2" />
                    Play Passage
                  </Button>
                </div>
              )}

              {state === 'listening' && (
                <div className="text-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <Volume2 className="w-10 h-10 text-indigo-600" />
                  </motion.div>
                  <p className="text-xl font-medium text-gray-900">Listening...</p>
                  <p className="text-gray-500 mt-2">
                    Pay attention to the main points
                  </p>
                </div>
              )}

              {state === 'recording' && (
                <div className="text-center">
                  <div className="mb-6">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto"
                    >
                      <Mic className="w-12 h-12 text-red-600" />
                    </motion.div>
                  </div>

                  {/* Timer */}
                  <div className="mb-6">
                    <div className={`text-5xl font-bold ${timeRemaining <= 10 ? 'text-red-600' : 'text-gray-900'}`}>
                      {timeRemaining}
                    </div>
                    <p className="text-gray-500">seconds remaining</p>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-6">
                    <motion.div
                      className="h-full bg-indigo-500"
                      initial={{ width: '100%' }}
                      animate={{ width: `${(timeRemaining / 30) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>

                  {/* Live transcription */}
                  {transcribedText && (
                    <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
                      <p className="text-sm text-gray-500 mb-1">Your response:</p>
                      <p className="text-gray-800">{transcribedText}</p>
                    </div>
                  )}

                  <Button
                    onClick={stopRecording}
                    variant="secondary"
                    size="lg"
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <MicOff className="w-5 h-5 mr-2" />
                    Stop Recording
                  </Button>
                </div>
              )}

              {state === 'processing' && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-lg text-gray-600">Analyzing your response...</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
