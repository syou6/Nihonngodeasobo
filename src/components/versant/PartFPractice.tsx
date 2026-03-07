import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Mic, MicOff, Volume2, HelpCircle, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { ResultDisplay } from './ResultDisplay';
import { useVersantStore } from '../../stores/versantStore';
import { getRandomQuestion } from '../../lib/versant-questions';
import { generatePracticeQuestion } from '../../lib/gemini-feedback';
import { supabase } from '../../lib/supabase';
import { tts } from '../../lib/tts';
import { VoiceTranscriber } from '../../lib/speechRecognition';
import { EN } from '../../i18n/en';
import { PRACTICE, DEFAULT_JLPT_LEVEL } from '../../lib/constants';
import type { JLPTLevel } from '../../lib/constants';
import toast from 'react-hot-toast';

interface PartFPracticeProps {
  onBack: () => void;
}

type PracticeState = 'ready' | 'listening' | 'recording' | 'processing' | 'result';

export const PartFPractice: React.FC<PartFPracticeProps> = ({ onBack }) => {
  const [state, setState] = useState<PracticeState>('ready');
  const [timeRemaining, setTimeRemaining] = useState(PRACTICE.PART_F.TIME_LIMIT);
  const [transcribedText, setTranscribedText] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState<any>(null);
  const [showQuestion, setShowQuestion] = useState(false);

  const transcriberRef = useRef<VoiceTranscriber | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { currentQuestion, setCurrentQuestion, saveAnswer, loading } = useVersantStore();

  const getUserJlptLevel = async (): Promise<JLPTLevel> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('jlpt_level')
          .eq('id', user.id)
          .single();
        return profile?.jlpt_level || DEFAULT_JLPT_LEVEL;
      }
    } catch {
      // Use default
    }
    return DEFAULT_JLPT_LEVEL;
  };

  const loadNewQuestion = async (excludeId?: string) => {
    const jlptLevel = await getUserJlptLevel();

    // Try AI generation first
    const aiQuestion = await generatePracticeQuestion('F', jlptLevel);
    if (aiQuestion) {
      setCurrentQuestion({
        id: `f-ai-${Date.now()}`,
        part: 'F',
        text: aiQuestion.text,
        timeLimit: aiQuestion.timeLimit,
        category: 'AI Generated'
      });
      return;
    }

    // Fallback to hardcoded questions
    const question = getRandomQuestion('F', undefined, excludeId);
    setCurrentQuestion(question);
  };

  useEffect(() => {
    loadNewQuestion();

    return () => {
      tts.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (transcriberRef.current) transcriberRef.current.abort();
    };
  }, []);

  const playQuestion = async () => {
    if (!currentQuestion) return;

    setState('listening');

    try {
      await tts.speak(currentQuestion.text, { rate: PRACTICE.PART_F.TTS_RATE });
      setTimeout(() => {
        startRecording();
      }, PRACTICE.PART_F.RECORDING_DELAY_MS);
    } catch (error) {
      console.error('TTS error:', error);
      toast.error(EN.versant.ttsError);
      startRecording();
    }
  };

  const startRecording = async () => {
    if (!currentQuestion) return;

    setState('recording');
    setTimeRemaining(currentQuestion.timeLimit);
    setTranscribedText('');
    audioChunksRef.current = [];

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
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    let finalText = transcribedText;
    if (transcriberRef.current) {
      finalText = transcriberRef.current.stop();
      setTranscribedText(finalText);
    }

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

    if (currentQuestion) {
      try {
        const answer = await saveAnswer(currentQuestion.id, finalText, audioBlob);
        setCurrentAnswer(answer);
        setState('result');
      } catch (error) {
        console.error('Failed to save answer:', error);
        toast.error(EN.versant.processError);
        setState('ready');
      }
    }
  };

  const tryAnother = async () => {
    setCurrentAnswer(null);
    setTranscribedText('');
    setShowQuestion(false);
    setCurrentQuestion(null);
    setState('ready');
    await loadNewQuestion(currentQuestion?.id);
  };

  if (!currentQuestion) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const timeLimit = currentQuestion.timeLimit;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{EN.versant.partF.title}</h1>
          <p className="text-gray-600">{EN.versant.partF.description}</p>
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
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <p className="text-purple-800">
                <strong>Instructions:</strong> {EN.versant.partF.instructions}
              </p>
            </div>

            {/* Collapsible Question Text */}
            <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowQuestion(!showQuestion)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {showQuestion ? (
                    <EyeOff className="w-5 h-5 text-gray-500" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-500" />
                  )}
                  <span className="font-medium text-gray-700">
                    {showQuestion ? EN.versant.partF.hideQuestion : EN.versant.partF.showQuestion}
                  </span>
                </div>
                {showQuestion ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              <AnimatePresence>
                {showQuestion && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-200"
                  >
                    <div className="p-4 bg-purple-50">
                      <p className="text-sm text-purple-600 font-medium mb-1">{EN.versant.partF.questionLabel}</p>
                      <p className="text-lg text-gray-800">{currentQuestion.text}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Question Card */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
              {state === 'ready' && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <HelpCircle className="w-8 h-8 text-purple-600" />
                  </div>
                  <p className="text-gray-600 mb-6">
                    {EN.versant.partF.pressPlay}
                  </p>
                  <Button
                    onClick={playQuestion}
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto bg-purple-500 hover:bg-purple-600"
                  >
                    <Play className="w-6 h-6 mr-2" />
                    {EN.versant.partF.playButton}
                  </Button>
                </div>
              )}

              {state === 'listening' && (
                <div className="text-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <Volume2 className="w-10 h-10 text-purple-600" />
                  </motion.div>
                  <p className="text-xl font-medium text-gray-900 mb-4">{EN.versant.playing}</p>
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
                    <div className={`text-5xl font-bold ${timeRemaining <= PRACTICE.TIMER_WARNING_THRESHOLD ? 'text-red-600' : 'text-gray-900'}`}>
                      {timeRemaining}
                    </div>
                    <p className="text-gray-500">{EN.versant.secondsRemaining}</p>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-6">
                    <motion.div
                      className="h-full bg-purple-500"
                      initial={{ width: '100%' }}
                      animate={{ width: `${(timeRemaining / timeLimit) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>

                  {/* Live transcription */}
                  {transcribedText && (
                    <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
                      <p className="text-sm text-gray-500 mb-1">{EN.versant.yourResponseLabel}</p>
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
                    {EN.versant.stopRecording}
                  </Button>
                </div>
              )}

              {state === 'processing' && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-lg text-gray-600">{EN.versant.analyzing}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
