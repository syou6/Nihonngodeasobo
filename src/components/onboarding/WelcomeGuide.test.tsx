import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeGuide } from './WelcomeGuide';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: {
      div: React.forwardRef(({ children, ...props }: any, ref: any) => React.createElement('div', { ...props, ref }, children)),
      button: React.forwardRef(({ children, ...props }: any, ref: any) => React.createElement('button', { ...props, ref }, children)),
      circle: React.forwardRef((props: any, ref: any) => React.createElement('circle', { ...props, ref })),
      p: React.forwardRef(({ children, ...props }: any, ref: any) => React.createElement('p', { ...props, ref }, children)),
      span: React.forwardRef(({ children, ...props }: any, ref: any) => React.createElement('span', { ...props, ref }, children)),
    },
    AnimatePresence: ({ children }: any) => children,
  };
});

// Mock lucide-react icons - return simple spans for all used icons
vi.mock('lucide-react', () => {
  const mockIcon = (name: string) => (props: any) => <span data-testid={`icon-${name}`} className={props.className} />;
  return {
    Mic: mockIcon('mic'),
    AudioLines: mockIcon('audiolines'),
    Brain: mockIcon('brain'),
    TrendingUp: mockIcon('trending'),
    ChevronRight: mockIcon('chevron'),
    BookOpen: mockIcon('book'),
    Sparkles: mockIcon('sparkles'),
    Target: mockIcon('target'),
    Clock: mockIcon('clock'),
    Users: mockIcon('users'),
    Star: mockIcon('star'),
    Zap: mockIcon('zap'),
    CheckCircle: mockIcon('check'),
    AlertTriangle: mockIcon('alert'),
    Award: mockIcon('award'),
    Heart: mockIcon('heart'),
    Globe: mockIcon('globe'),
    Briefcase: mockIcon('briefcase'),
    Gamepad2: mockIcon('gamepad'),
    Plane: mockIcon('plane'),
    GraduationCap: mockIcon('grad'),
    Volume2: mockIcon('volume'),
    PenTool: mockIcon('pen'),
    Eye: mockIcon('eye'),
    Headphones: mockIcon('headphones'),
    MessageCircle: mockIcon('message'),
    Timer: mockIcon('timer'),
    Crown: mockIcon('crown'),
    Shield: mockIcon('shield'),
    Lock: mockIcon('lock'),
    ArrowRight: mockIcon('arrow'),
    BarChart3: mockIcon('chart'),
  };
});

// Mock Button component
vi.mock('../ui/Button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

// Mock Logo component
vi.mock('../ui/Logo', () => ({
  LogoWithText: () => <div data-testid="logo">NihonGo</div>,
}));

// Mock stripe
vi.mock('../../lib/stripe', () => ({
  pricingPlans: [
    { id: 'free', name: 'Free', price: 0, interval: 'month', features: [] },
    { id: 'premium', name: 'Premium', price: 4.99, interval: 'month', features: [] },
  ],
  default: { createCheckoutSession: vi.fn() },
}));

// Mock auth store
vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({ user: null })),
}));

describe('WelcomeGuide (OnboardingFlow)', () => {
  let mockOnComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnComplete = vi.fn();
    localStorage.clear();
  });

  it('renders nothing when show is false', () => {
    const { container } = render(
      <WelcomeGuide onComplete={mockOnComplete} show={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders welcome screen first', () => {
    render(<WelcomeGuide onComplete={mockOnComplete} />);
    expect(screen.getByText(/personal/i)).toBeInTheDocument();
    expect(screen.getByText(/Japanese learning path/i)).toBeInTheDocument();
    expect(screen.getByText("Let's Go")).toBeInTheDocument();
  });

  it('shows logo on the welcome step', () => {
    render(<WelcomeGuide onComplete={mockOnComplete} />);
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('navigates to name step when clicking Let\'s Go', () => {
    render(<WelcomeGuide onComplete={mockOnComplete} />);
    fireEvent.click(screen.getByText("Let's Go"));
    expect(screen.getByText(/What should we call you/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your first name')).toBeInTheDocument();
  });

  it('requires name to proceed from name step', () => {
    render(<WelcomeGuide onComplete={mockOnComplete} />);
    fireEvent.click(screen.getByText("Let's Go"));

    const nextBtn = screen.getByText('Next').closest('button');
    expect(nextBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Your first name'), { target: { value: 'Alex' } });
    expect(nextBtn).not.toBeDisabled();
  });

  it('uses name in subsequent screens', () => {
    render(<WelcomeGuide onComplete={mockOnComplete} />);
    fireEvent.click(screen.getByText("Let's Go"));

    // Enter name
    fireEvent.change(screen.getByPlaceholderText('Your first name'), { target: { value: 'Alex' } });
    fireEvent.click(screen.getByText('Next'));

    // Motivation screen should use name
    expect(screen.getByText(/Nice to meet you, Alex/)).toBeInTheDocument();
  });

  it('shows motivation options as multi-select', () => {
    render(<WelcomeGuide onComplete={mockOnComplete} />);
    fireEvent.click(screen.getByText("Let's Go"));
    fireEvent.change(screen.getByPlaceholderText('Your first name'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Next'));

    expect(screen.getByText('Anime & Manga')).toBeInTheDocument();
    expect(screen.getByText('Travel to Japan')).toBeInTheDocument();
    expect(screen.getByText('Career & Business')).toBeInTheDocument();
    expect(screen.getByText('Pass JLPT Exam')).toBeInTheDocument();
  });

  it('requires at least one motivation to proceed', () => {
    render(<WelcomeGuide onComplete={mockOnComplete} />);
    fireEvent.click(screen.getByText("Let's Go"));
    fireEvent.change(screen.getByPlaceholderText('Your first name'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Next'));

    const nextBtn = screen.getByText('Next').closest('button');
    expect(nextBtn).toBeDisabled();

    fireEvent.click(screen.getByText('Anime & Manga'));
    expect(nextBtn).not.toBeDisabled();
  });

  it('navigates to the struggles step after motivation (pitch-first flow)', () => {
    render(<WelcomeGuide onComplete={mockOnComplete} />);
    fireEvent.click(screen.getByText("Let's Go"));
    fireEvent.change(screen.getByPlaceholderText('Your first name'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Anime & Manga'));
    fireEvent.click(screen.getByText('Next'));

    expect(screen.getByText(/struggle with most/i)).toBeInTheDocument();
    expect(screen.getByText('Sounding foreign (pitch accent)')).toBeInTheDocument();
  });

  it('shows Skip button on question screens', () => {
    render(<WelcomeGuide onComplete={mockOnComplete} />);
    expect(screen.getByText('Skip')).toBeInTheDocument();
  });

  it('skip completes with default N4 level', () => {
    render(<WelcomeGuide onComplete={mockOnComplete} />);
    fireEvent.click(screen.getByText('Skip'));

    expect(mockOnComplete).toHaveBeenCalled();
    const callArg = mockOnComplete.mock.calls[0][0];
    expect(callArg).toBe('N4');
    expect(localStorage.getItem('onboardingCompleted')).toBe('true');
  });

  it('renders progress bar', () => {
    const { container } = render(
      <WelcomeGuide onComplete={mockOnComplete} />
    );
    // Should have percentage text
    expect(container.querySelector('.tabular-nums')).toBeInTheDocument();
  });

  it('saves onboarding data including name to localStorage on skip', () => {
    render(<WelcomeGuide onComplete={mockOnComplete} />);

    // Go to name, enter name
    fireEvent.click(screen.getByText("Let's Go"));
    fireEvent.change(screen.getByPlaceholderText('Your first name'), { target: { value: 'Alex' } });
    fireEvent.click(screen.getByText('Next'));

    // Select motivation
    fireEvent.click(screen.getByText('Anime & Manga'));
    fireEvent.click(screen.getByText('Next'));

    // Skip from the struggles step
    fireEvent.click(screen.getByText('Skip'));

    const savedData = JSON.parse(localStorage.getItem('onboardingData') || '{}');
    expect(savedData.name).toBe('Alex');
    expect(savedData.motivation).toContain('anime');
  });

  it('navigates through diagnosis screen with score', () => {
    render(<WelcomeGuide onComplete={mockOnComplete} />);

    // New pitch flow: welcome -> name -> motivation -> struggles -> daily-time -> diagnosis
    fireEvent.click(screen.getByText("Let's Go"));
    fireEvent.change(screen.getByPlaceholderText('Your first name'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Anime & Manga'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Sounding foreign (pitch accent)'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('5 minutes'));
    fireEvent.click(screen.getByText('Next'));

    // Diagnosis screen
    expect(screen.getByText(/Learning Profile/)).toBeInTheDocument();
    expect(screen.getByText('/ 100')).toBeInTheDocument();
  });
});
