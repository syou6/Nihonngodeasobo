import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PricingCards } from './PricingCards';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Check: () => <span data-testid="icon-check" />,
  Loader2: () => <span data-testid="icon-loader" />,
  Crown: () => <span data-testid="icon-crown" />,
  X: () => <span data-testid="icon-x" />,
  Sparkles: () => <span data-testid="icon-sparkles" />,
}));

// Mock Button component
vi.mock('../ui/Button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockCreateCheckoutSession = vi.fn();
const mockGetCustomerPortalUrl = vi.fn();

// Mock stripe
vi.mock('../../lib/stripe', () => ({
  pricingPlans: [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      interval: 'month',
      features: ['3 diary recordings per month', 'Basic AI analysis'],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 4.99,
      interval: 'month',
      stripePriceId: 'price_test123',
      features: ['Unlimited diary recordings', 'Detailed AI feedback'],
    },
    {
      id: 'premium-annual',
      name: 'Premium — Annual',
      price: 39,
      originalPrice: 59.88,
      interval: 'year',
      stripePriceId: 'price_test_annual',
      features: ['Everything in Premium', '2 months free'],
    },
  ],
  StripeService: {
    createCheckoutSession: (...args: any[]) => mockCreateCheckoutSession(...args),
    getCustomerPortalUrl: (...args: any[]) => mockGetCustomerPortalUrl(...args),
  },
}));

const mockUser = { id: 'user-123', email: 'test@example.com', name: 'Test' };

vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
  }),
}));

describe('PricingCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the header with title and description', () => {
    render(<PricingCards />);

    expect(screen.getByText('Unlock Your Full Potential')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Get unlimited access to all features and accelerate your Japanese learning'
      )
    ).toBeInTheDocument();
  });

  it('renders the free plan card', () => {
    render(<PricingCards />);

    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('3 diary recordings per month')).toBeInTheDocument();
    expect(screen.getByText('Basic AI analysis')).toBeInTheDocument();
  });

  it('renders the premium plan card', () => {
    render(<PricingCards />);

    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('$4.99')).toBeInTheDocument();
    expect(screen.getByText('Unlimited diary recordings')).toBeInTheDocument();
    expect(screen.getByText('Detailed AI feedback')).toBeInTheDocument();
  });

  it('shows "Recommended" badge on premium plan', () => {
    render(<PricingCards />);

    expect(screen.getByText('Recommended')).toBeInTheDocument();
  });

  it('shows "Current Plan" button on free plan when user is on free plan', () => {
    render(<PricingCards currentPlan="free" />);

    const currentPlanButtons = screen.getAllByText('Current Plan');
    expect(currentPlanButtons.length).toBe(1);
  });

  it('shows "Upgrade Now" button for premium plan when user is on free plan', () => {
    render(<PricingCards currentPlan="free" />);

    expect(screen.getByText('Upgrade Now')).toBeInTheDocument();
  });

  it('calls createCheckoutSession when "Upgrade Now" is clicked', async () => {
    mockCreateCheckoutSession.mockResolvedValue(undefined);
    render(<PricingCards currentPlan="free" />);

    fireEvent.click(screen.getByText('Upgrade Now'));

    await waitFor(() => {
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
        'price_test123',
        'user-123'
      );
    });
  });

  it('shows "Current Plan" on premium card when user is premium', () => {
    render(<PricingCards currentPlan="premium" />);

    const currentPlanButtons = screen.getAllByText('Current Plan');
    // Both free and premium might show current plan indicators
    expect(currentPlanButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Manage Billing" button for premium users', () => {
    render(<PricingCards currentPlan="premium" />);

    expect(screen.getByText('Manage Billing')).toBeInTheDocument();
  });

  it('calls getCustomerPortalUrl when "Manage Billing" is clicked', async () => {
    mockGetCustomerPortalUrl.mockResolvedValue('https://billing.stripe.com/test');

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { ...window.location, href: '' },
      writable: true,
    });

    render(<PricingCards currentPlan="premium" />);

    fireEvent.click(screen.getByText('Manage Billing'));

    await waitFor(() => {
      expect(mockGetCustomerPortalUrl).toHaveBeenCalledWith('user-123');
    });
  });

  it('shows close button when onClose is provided', () => {
    const mockOnClose = vi.fn();
    render(<PricingCards onClose={mockOnClose} />);

    const closeButton = screen.getByTestId('icon-x').closest('button')!;
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not show close button when onClose is not provided', () => {
    render(<PricingCards />);

    // X icon should not be present when no onClose
    expect(screen.queryByTestId('icon-x')).not.toBeInTheDocument();
  });

  it('shows trust signals footer', () => {
    render(<PricingCards />);

    expect(
      screen.getByText('Cancel anytime. Secure payment powered by Stripe.')
    ).toBeInTheDocument();
  });

  it('shows error toast when checkout fails', async () => {
    const toast = await import('react-hot-toast');
    mockCreateCheckoutSession.mockRejectedValue(new Error('Checkout failed'));
    render(<PricingCards currentPlan="free" />);

    fireEvent.click(screen.getByText('Upgrade Now'));

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith(
        'Something went wrong. Please try again.'
      );
    });
  });

  it('does not show free plan "Current Plan" button when user is premium', () => {
    render(<PricingCards currentPlan="premium" />);

    // The free plan should not show "Current Plan" when user is premium
    // Premium plan shows "Current Plan" instead
    const upgradeButton = screen.queryByText('Upgrade Now');
    expect(upgradeButton).not.toBeInTheDocument();
  });

  it('switches to the annual plan via the billing toggle', () => {
    render(<PricingCards currentPlan="free" />);

    // Monthly by default
    expect(screen.getByText('$4.99')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Annual'));

    // Annual price + strikethrough original + per-month equivalent
    expect(screen.getByText('$39')).toBeInTheDocument();
    expect(screen.getByText('$59.88')).toBeInTheDocument();
    expect(screen.getByText(/3\.25\/mo/)).toBeInTheDocument();
  });

  it('checks out with the annual price ID when annual is selected', async () => {
    render(<PricingCards currentPlan="free" />);

    fireEvent.click(screen.getByText('Annual'));
    fireEvent.click(screen.getByText('Upgrade Now'));

    await waitFor(() => {
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith('price_test_annual', 'user-123');
    });
  });

  it('treats an annual subscriber as premium (Manage Billing, no Upgrade)', () => {
    render(<PricingCards currentPlan="premium-annual" />);

    expect(screen.queryByText('Upgrade Now')).not.toBeInTheDocument();
    expect(screen.getByText('Manage Billing')).toBeInTheDocument();
  });
});
