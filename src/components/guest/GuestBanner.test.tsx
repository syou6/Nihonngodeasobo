import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GuestBanner } from './GuestBanner';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertCircle: () => <span data-testid="icon-alert" />,
  LogIn: () => <span data-testid="icon-login" />,
  Sparkles: () => <span data-testid="icon-sparkles" />,
}));

// Mock Button component
vi.mock('../ui/Button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

// Use module-level variables to control mock behavior per test
let mockIsGuestMode = true;
let mockRemainingTries = 2;
const mockSetGuestMode = vi.fn();
const mockClearGuestData = vi.fn();

vi.mock('../../stores/guestStore', () => ({
  useGuestStore: () => ({
    getRemainingTries: () => mockRemainingTries,
    isGuestMode: mockIsGuestMode,
    setGuestMode: mockSetGuestMode,
    clearGuestData: mockClearGuestData,
  }),
}));

describe('GuestBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsGuestMode = true;
    mockRemainingTries = 2;
    sessionStorage.clear();
  });

  it('renders the guest mode banner text', () => {
    render(<GuestBanner />);

    expect(screen.getAllByText('Guest Mode').length).toBeGreaterThan(0);
  });

  it('displays remaining tries count', () => {
    mockRemainingTries = 2;
    render(<GuestBanner />);

    // Both mobile and desktop layout show remaining tries
    const remainingTexts = screen.getAllByText(/2 tries remaining/);
    expect(remainingTexts.length).toBeGreaterThan(0);
  });

  it('displays 0 remaining tries when all used up', () => {
    mockRemainingTries = 0;
    render(<GuestBanner />);

    const remainingTexts = screen.getAllByText(/0 tries remaining/);
    expect(remainingTexts.length).toBeGreaterThan(0);
  });

  it('renders login buttons for both mobile and desktop layouts', () => {
    render(<GuestBanner />);

    // Mobile login button text
    expect(screen.getByText('Login')).toBeInTheDocument();
    // Desktop login button text
    expect(screen.getByText('Login / Sign Up')).toBeInTheDocument();
  });

  it('clears guest data and redirects on login button click', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    render(<GuestBanner />);

    // Click the desktop login button
    const loginButton = screen.getByText('Login / Sign Up').closest('button')!;
    fireEvent.click(loginButton);

    expect(mockClearGuestData).toHaveBeenCalled();
    expect(mockSetGuestMode).toHaveBeenCalledWith(false);
    expect(sessionStorage.getItem('showAuthForm')).toBe('true');
  });

  it('renders nothing when not in guest mode', () => {
    mockIsGuestMode = false;

    const { container } = render(<GuestBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('shows "Create Free Account" text on desktop', () => {
    render(<GuestBanner />);

    expect(screen.getByText('Create Free Account')).toBeInTheDocument();
  });

  it('shows login prompt text on desktop', () => {
    render(<GuestBanner />);

    expect(screen.getByText('Login to save all features')).toBeInTheDocument();
  });
});
