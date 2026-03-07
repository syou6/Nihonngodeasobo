import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Logo, LogoWithText } from './Logo';

describe('Logo', () => {
  it('renders an img with logo.png src', () => {
    render(<Logo />);
    const img = screen.getByAltText('NihonGo');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/logo.png');
  });

  it('applies default md size class', () => {
    const { container } = render(<Logo />);
    expect(container.firstElementChild?.className).toContain('w-20 h-20');
  });

  it('applies sm size class', () => {
    const { container } = render(<Logo size="sm" />);
    expect(container.firstElementChild?.className).toContain('w-12 h-12');
  });

  it('applies lg size class', () => {
    const { container } = render(<Logo size="lg" />);
    expect(container.firstElementChild?.className).toContain('w-32 h-32');
  });

  it('applies xl size class', () => {
    const { container } = render(<Logo size="xl" />);
    expect(container.firstElementChild?.className).toContain('w-48 h-48');
  });

  it('applies custom className', () => {
    const { container } = render(<Logo className="custom-class" />);
    expect(container.firstElementChild?.className).toContain('custom-class');
  });
});

describe('LogoWithText', () => {
  it('renders logo image', () => {
    render(<LogoWithText />);
    expect(screen.getByAltText('NihonGo')).toBeInTheDocument();
  });

  it('renders app name', () => {
    render(<LogoWithText />);
    expect(screen.getByText('NihonGo')).toBeInTheDocument();
  });

  it('renders tagline', () => {
    render(<LogoWithText />);
    expect(screen.getByText('Learn Japanese Every Day')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<LogoWithText className="my-class" />);
    expect(container.firstElementChild?.className).toContain('my-class');
  });
});
