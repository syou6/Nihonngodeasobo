import React from 'react';
import { OnboardingFlow } from './OnboardingFlow';

interface WelcomeGuideProps {
  onComplete: (selectedLevel?: string) => void;
  show?: boolean;
}

/**
 * WelcomeGuide wraps OnboardingFlow to maintain backward compatibility
 * with AppPage.tsx which passes onComplete(selectedLevel?: string).
 */
export const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ onComplete, show = true }) => {
  return (
    <OnboardingFlow
      show={show}
      onComplete={(data) => {
        // Save full onboarding data for personalization
        localStorage.setItem('onboardingData', JSON.stringify(data));
        localStorage.setItem('jlptLevel', data.jlptLevel);
        // Call original callback with selected JLPT level
        onComplete(data.jlptLevel);
      }}
    />
  );
};
