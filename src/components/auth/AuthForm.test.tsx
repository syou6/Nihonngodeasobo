import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthForm } from './AuthForm';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  LogIn: () => <span data-testid="icon-login" />,
  UserPlus: () => <span data-testid="icon-userplus" />,
  UserCheck: () => <span data-testid="icon-usercheck" />,
}));

// Mock Button component
vi.mock('../ui/Button', () => ({
  Button: ({ children, onClick, disabled, type, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} type={type} {...props}>
      {children}
    </button>
  ),
}));

// Mock Logo component
vi.mock('../ui/Logo', () => ({
  LogoWithText: () => <div data-testid="logo">NihonGo</div>,
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSignUp = vi.fn();
const mockSignIn = vi.fn();
const mockSignInWithGoogle = vi.fn();
const mockSetGuestMode = vi.fn();

// Mock stores
vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    signUp: mockSignUp,
    signIn: mockSignIn,
    signInWithGoogle: mockSignInWithGoogle,
  }),
}));

vi.mock('../../stores/guestStore', () => ({
  useGuestStore: () => ({
    setGuestMode: mockSetGuestMode,
  }),
}));

describe('AuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders login form by default', () => {
    render(<AuthForm />);

    // "Login" appears in subtitle and button - use getAllByText
    const loginTexts = screen.getAllByText('Login');
    expect(loginTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
    // Name field should not be visible in login mode
    expect(screen.queryByText('Name')).not.toBeInTheDocument();
  });

  it('renders signup form when sessionStorage has showSignupForm', () => {
    sessionStorage.setItem('showSignupForm', 'true');
    render(<AuthForm />);

    const signUpTexts = screen.getAllByText('Sign Up');
    expect(signUpTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('toggles between login and signup', () => {
    render(<AuthForm />);

    // Initially login mode - find the toggle button (contains arrow)
    const toggleButton = screen.getByText(/Sign Up/);
    fireEvent.click(toggleButton);

    // Now in signup mode
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('shows name field only in signup mode', () => {
    render(<AuthForm />);

    expect(screen.queryByText('Name')).not.toBeInTheDocument();

    // Toggle to signup
    const toggleButton = screen.getByText(/Sign Up/);
    fireEvent.click(toggleButton);

    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('calls signIn on login form submission', async () => {
    mockSignIn.mockResolvedValue(undefined);
    render(<AuthForm />);

    // Labels don't have htmlFor, so use input type to find fields
    const emailInput = screen.getByRole('textbox', { name: '' }) ||
      document.querySelector('input[type="email"]')!;
    const inputs = document.querySelectorAll('input');
    const emailField = inputs[0] as HTMLInputElement; // email input
    const passwordField = inputs[1] as HTMLInputElement; // password input

    fireEvent.change(emailField, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordField, { target: { value: 'password123' } });

    const form = emailField.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('calls signUp on signup form submission', async () => {
    mockSignUp.mockResolvedValue(undefined);
    sessionStorage.setItem('showSignupForm', 'true');
    render(<AuthForm />);

    const inputs = document.querySelectorAll('input');
    // In signup mode: name, email, password
    const nameField = inputs[0] as HTMLInputElement;
    const emailField = inputs[1] as HTMLInputElement;
    const passwordField = inputs[2] as HTMLInputElement;

    fireEvent.change(nameField, { target: { value: 'Test User' } });
    fireEvent.change(emailField, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordField, { target: { value: 'password123' } });

    const form = emailField.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'password123', {
        name: 'Test User',
      });
    });
  });

  it('shows error toast when signIn fails', async () => {
    const toast = await import('react-hot-toast');
    mockSignIn.mockRejectedValue(new Error('Invalid credentials'));
    render(<AuthForm />);

    const inputs = document.querySelectorAll('input');
    const emailField = inputs[0] as HTMLInputElement;
    const passwordField = inputs[1] as HTMLInputElement;

    fireEvent.change(emailField, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordField, { target: { value: 'wrong' } });

    const form = emailField.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith('Invalid credentials');
    });
  });

  it('calls signInWithGoogle when Google button is clicked', async () => {
    mockSignInWithGoogle.mockResolvedValue(undefined);
    render(<AuthForm />);

    const googleButton = screen.getByText('Continue with Google');
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled();
    });
  });

  it('renders the guest mode button', () => {
    render(<AuthForm />);

    expect(screen.getByText('Try as Guest')).toBeInTheDocument();
    expect(screen.getByText('(3 tries)')).toBeInTheDocument();
  });

  it('activates guest mode when guest button is clicked', () => {
    // Mock window.location.reload
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    render(<AuthForm />);

    const guestButton = screen.getByText('Try as Guest').closest('button')!;
    fireEvent.click(guestButton);

    expect(mockSetGuestMode).toHaveBeenCalledWith(true);
  });

  it('shows "has account" text in signup mode', () => {
    sessionStorage.setItem('showSignupForm', 'true');
    render(<AuthForm />);

    expect(screen.getByText('Already have an account?')).toBeInTheDocument();
  });

  it('shows "no account" text in login mode', () => {
    render(<AuthForm />);

    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
  });

  it('renders the or divider', () => {
    render(<AuthForm />);

    expect(screen.getByText('or')).toBeInTheDocument();
  });

  it('renders the logo', () => {
    render(<AuthForm />);

    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });
});
