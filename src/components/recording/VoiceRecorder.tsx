import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { useDiaryStore } from '../../stores/diaryStore';
import { useGuestStore } from '../../stores/guestStore';
import { VoiceTranscriber } from '../../lib/speechRecognition';
import { VolumeIndicator } from '../audio/VolumeIndicator';
import { colors } from '../../styles/colorPalette';
import { EN } from '../../i18n/en';
import { Mic, MicOff, Play, Pause, Save, X, Trash2, Home, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface VoiceRecorderProps {
  onViewChange?: (view: string) => void;
  isGuest?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onViewChange, isGuest }) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [additionalText, setAdditionalText] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const transcriberRef = useRef<VoiceTranscriber | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const {
    isRecording,
    currentAudio,
    startRecording,
    stopRecording,
    clearRecording,
    createEntry
  } = useDiaryStore();

  const { createGuestDiary, canCreateMore } = useGuestStore();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (currentAudio && !isRecording) {
      const url = URL.createObjectURL(currentAudio);
      const audio = new Audio(url);
      setAudioElement(audio);

      audio.onended = () => setIsPlaying(false);

      return () => {
        URL.revokeObjectURL(url);
        setAudioElement(null);
      };
    }
  }, [currentAudio, isRecording]);

  // Analyze volume level
  const analyzeVolume = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalizedVolume = Math.min(100, (average / 128) * 100);

    setVolumeLevel(normalizedVolume);

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(analyzeVolume);
    }
  };

  const handleStartRecording = async () => {
    // Check if guest can create more
    if (isGuest && !canCreateMore()) {
      toast.error(EN.recording.guestLimit);
      return;
    }

    try {
      // Start audio recording
      await startRecording();

      // Start volume level analysis
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;

        analyzeVolume();
      } catch (error) {
        console.warn('Failed to initialize volume analysis:', error);
      }

      // Start speech recognition
      if (VoiceTranscriber.isSupported()) {
        console.log('Speech recognition supported: yes');
        transcriberRef.current = new VoiceTranscriber();
        setIsTranscribing(true);
        transcriberRef.current.start(
          (text, isFinal) => {
            setTranscribedText(text);
            console.log('Transcribing:', text, 'Final:', isFinal);
          },
          (error) => {
            console.error('Speech recognition error:', error);
            setIsTranscribing(false);
            if (error === 'not-allowed') {
              toast.error(EN.recording.micPermissionDenied);
            }
          }
        );
      } else {
        console.log('Speech recognition supported: no');
        toast.error(EN.recording.notSupported);
      }

      toast.success(EN.recording.startSuccess);

      // Guest mode auto-stop after 30 seconds
      if (isGuest) {
        setTimeout(() => {
          if (isRecording) {
            handleStopRecording();
            toast(EN.recording.guestTimeLimit);
          }
        }, 30000);
      }
    } catch (error) {
      toast.error(EN.recording.saveError);
    }
  };

  const handleStopRecording = async () => {
    console.log('handleStopRecording started');
    try {
      // Stop recording
      const audioBlob = await stopRecording();
      console.log('Recording stopped:', {
        blobSize: audioBlob?.size,
        blobType: audioBlob?.type
      });

      // Stop volume analysis
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setVolumeLevel(0);

      // Stop speech recognition and get final text
      if (transcriberRef.current) {
        const finalText = transcriberRef.current.stop();
        setTranscribedText(finalText);
        setIsTranscribing(false);
        console.log('Final transcription:', finalText);
      }

      toast.success(EN.recording.stopSuccess);
      setShowSaveDialog(true);
      console.log('Save dialog shown');
    } catch (error) {
      console.error('Stop recording error:', error);
      toast.error(EN.recording.saveError + ': ' + (error as Error).message);
    }
  };

  const handlePlayPause = () => {
    if (!audioElement) return;

    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSave = async () => {
    console.log('handleSave started:', {
      hasCurrentAudio: !!currentAudio,
      audioSize: currentAudio?.size,
      isSaving,
      isGuest
    });

    if (!currentAudio) {
      toast.error(EN.recording.noRecordingData);
      return;
    }

    if (isSaving) {
      console.log('Already saving');
      return;
    }

    setIsSaving(true);

    let contentToSave = '';

    try {
      // Combine transcribed text and additional notes
      if (transcribedText.trim()) {
        contentToSave = transcribedText.trim();
        if (additionalText.trim()) {
          contentToSave += '\n\n[Additional Notes]\n' + additionalText.trim();
        }
      } else if (additionalText.trim()) {
        contentToSave = additionalText.trim();
      } else {
        contentToSave = EN.recording.noTranscription;
      }

      console.log('Saving:', {
        transcribedLength: transcribedText.length,
        additionalLength: additionalText.length,
        contentLength: contentToSave.length,
        audioSize: currentAudio.size
      });

      // Show loading toast
      const loadingToast = toast.loading(EN.recording.saving);

      // Timeout setting (120 seconds - mobile uploads can be slow)
      const timeoutId = setTimeout(() => {
        toast.dismiss(loadingToast);
        toast.error(EN.recording.saveTimeout);
        setIsSaving(false);
      }, 120000);

      // Save as guest or normal mode
      let saveResult;
      console.log('Save processing:', {
        isGuest,
        contentLength: contentToSave.length,
        audioSize: currentAudio.size
      });

      if (isGuest) {
        console.log('Saving as guest');
        await createGuestDiary(contentToSave, currentAudio);
        saveResult = true;
      } else {
        console.log('Saving as normal user');
        saveResult = await createEntry(contentToSave, currentAudio);
      }

      console.log('Save result:', saveResult);

      // Clear timeout
      clearTimeout(timeoutId);

      // Check if save was successful
      if (saveResult !== undefined) {
        toast.dismiss(loadingToast);
        toast.success(EN.recording.saveSuccess);

        clearRecording();
        setShowSaveDialog(false);
        setAdditionalText('');
        setTranscribedText('');

        // Navigate to diary to show AI feedback
        if (onViewChange) {
          setTimeout(() => {
            onViewChange('diary');
          }, 500);
        }
      } else {
        throw new Error('Save process did not complete');
      }
    } catch (error) {
      console.error('Save error details:', {
        error,
        message: (error as Error).message,
        stack: (error as Error).stack,
        audioSize: currentAudio?.size,
        contentLength: contentToSave?.length
      });
      try {
        toast.dismiss();
      } catch {}
      toast.error(EN.recording.saveError + ': ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    clearRecording();
    setShowSaveDialog(false);
    setAdditionalText('');
    setTranscribedText('');
    if (transcriberRef.current) {
      transcriberRef.current.abort();
    }
    toast.success(EN.recording.discardSuccess);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 pt-8 sm:pt-12">
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        {/* Header with Instructions */}
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {EN.recording.title}
          </h2>
          {!isRecording && !currentAudio && (
            <p className="text-xl text-gray-600">
              {EN.recording.instruction}
            </p>
          )}
        </div>

        <div className="text-center">
          {/* Recording Status */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mb-8"
              >
                <div className="rounded-2xl p-8 mb-6" style={{ backgroundColor: colors.record.light }}>
                  {/* Volume meter */}
                  <VolumeIndicator volume={volumeLevel} isRecording={isRecording} />

                  <div className="flex justify-center mb-4">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: colors.record.dark }}
                    >
                      <Mic className="w-8 h-8 text-white" />
                    </motion.div>
                  </div>
                  <div className="text-red-600 text-3xl font-bold mb-2">
                    {EN.recording.recording}
                  </div>
                  <div className="text-4xl font-bold text-gray-800">
                    {formatTime(recordingTime)}
                  </div>

                  {/* Real-time speech recognition display */}
                  {isTranscribing && transcribedText && (
                    <div className="mt-4 p-4 bg-white rounded-lg">
                      <p className="text-sm text-gray-500 mb-2">{EN.recording.transcribing}</p>
                      <p className="text-base text-gray-700">{transcribedText}</p>
                    </div>
                  )}

                  <p className="text-lg text-gray-600 mt-4">
                    {EN.recording.whenDone}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recording Button */}
          {!currentAudio && (
            <div className="mb-6 sm:mb-8">
              {isRecording ? (
                <Button
                  onClick={handleStopRecording}
                  variant="secondary"
                  size="xl"
                  className="w-full sm:w-64 h-24 text-white rounded-2xl"
                  style={{
                    backgroundColor: colors.record.dark,
                    ':hover': { backgroundColor: colors.record.darker }
                  }}
                >
                  <MicOff className="w-10 h-10" />
                  <span className="text-2xl font-bold ml-3">{EN.recording.stopButton}</span>
                </Button>
              ) : (
                <div className="space-y-6">
                  <motion.button
                    onClick={handleStartRecording}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-48 h-48 sm:w-56 sm:h-56 mx-auto bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full shadow-xl flex flex-col items-center justify-center gap-3"
                  >
                    <Mic className="w-16 h-16 sm:w-20 sm:h-20" />
                    <span className="text-base sm:text-xl font-bold">{EN.recording.startButton}</span>
                  </motion.button>
                  <p className="text-lg text-gray-500">
                    {EN.recording.pressToStart}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Playback Controls */}
          {currentAudio && !showSaveDialog && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="bg-green-50 rounded-2xl p-8 mb-6">
                <div className="text-3xl font-bold text-green-600 mb-4">
                  ✓ {EN.recording.completed}
                </div>
                <p className="text-xl text-gray-700 mb-6">
                  {EN.recording.reviewAndSave}
                </p>

                <div className="space-y-4">
                  {/* Play button */}
                  <Button
                    onClick={handlePlayPause}
                    variant="outline"
                    size="xl"
                    className="w-full sm:w-80 h-20 text-xl border-2"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-8 h-8 mr-3" />
                        <span className="font-bold">{EN.recording.pause}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-8 h-8 mr-3" />
                        <span className="font-bold">{EN.recording.play}</span>
                      </>
                    )}
                  </Button>

                  {/* Save button */}
                  <Button
                    onClick={() => setShowSaveDialog(true)}
                    variant="primary"
                    size="xl"
                    className="w-full sm:w-80 h-20 text-xl bg-green-500 hover:bg-green-600"
                  >
                    <Save className="w-8 h-8 mr-3" />
                    <span className="font-bold">{EN.recording.save}</span>
                  </Button>

                  {/* Re-record button */}
                  <Button
                    onClick={handleDiscard}
                    variant="ghost"
                    size="lg"
                    className="w-full sm:w-80 text-lg text-gray-600"
                  >
                    <Trash2 className="w-6 h-6 mr-2" />
                    {EN.recording.discard}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Save Dialog */}
        <AnimatePresence>
          {showSaveDialog && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-8"
            >
              <div className="rounded-2xl p-8" style={{ backgroundColor: colors.record.light }}>
                <h3 className="text-3xl font-bold text-gray-900 mb-6 text-center">
                  {EN.recording.saveTitle}
                </h3>

                {/* Transcribed text */}
                {transcribedText && (
                  <div className="mb-6 p-4 bg-white rounded-xl">
                    <label className="block text-lg font-bold text-gray-700 mb-2">
                      {EN.recording.transcribedText}
                    </label>
                    <p className="text-base text-gray-700 whitespace-pre-wrap">
                      {transcribedText}
                    </p>
                  </div>
                )}

                <div className="mb-8">
                  <label className="block text-xl font-bold text-gray-700 mb-3">
                    {EN.recording.additionalNotes}
                  </label>
                  <textarea
                    value={additionalText}
                    onChange={(e) => setAdditionalText(e.target.value)}
                    placeholder={EN.recording.notesPlaceholder}
                    className="w-full px-5 py-4 text-xl border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>

                <div className="space-y-4">
                  <Button
                    onClick={handleSave}
                    variant="primary"
                    size="xl"
                    className="w-full h-20 text-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-8 h-8 mr-3"
                        >
                          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
                        </motion.div>
                        <span className="font-bold">{EN.recording.saving}</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-8 h-8 mr-3" />
                        <span className="font-bold">{EN.recording.saveButton}</span>
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => setShowSaveDialog(false)}
                    variant="outline"
                    size="lg"
                    className="w-full h-16 text-lg"
                    disabled={isSaving}
                  >
                    <X className="w-6 h-6 mr-2" />
                    {EN.recording.back}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
