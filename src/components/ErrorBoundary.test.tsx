import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { captureError } from '../lib/monitoring';

vi.mock('../lib/monitoring', () => ({
  captureError: vi.fn(),
}));

// Component that throws an error
const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Child content rendered successfully</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress React error boundary console.error noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('renders fallback UI when a child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops!')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText(
        'An unexpected error occurred. Please try refreshing the page.'
      )
    ).toBeInTheDocument();
  });

  it('renders the refresh button in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
  });

  it('does not render children when in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(
      screen.queryByText('Child content rendered successfully')
    ).not.toBeInTheDocument();
  });

  it('reports the error via monitoring in componentDidCatch', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(captureError).toHaveBeenCalled();
    const [reportedError] = vi.mocked(captureError).mock.calls[0];
    expect(reportedError).toBeInstanceOf(Error);
    expect((reportedError as Error).message).toBe('Test error');
  });

  it('resets state and reloads when refresh button is clicked', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Refresh Page'));

    expect(reloadMock).toHaveBeenCalled();
  });

  it('renders multiple children correctly when no error', () => {
    render(
      <ErrorBoundary>
        <div>First child</div>
        <div>Second child</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('First child')).toBeInTheDocument();
    expect(screen.getByText('Second child')).toBeInTheDocument();
  });

  it('catches errors from deeply nested components', () => {
    const DeeplyNested = () => {
      throw new Error('Deep error');
    };

    render(
      <ErrorBoundary>
        <div>
          <div>
            <DeeplyNested />
          </div>
        </div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops!')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
