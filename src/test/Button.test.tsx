import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '../components/Button';

describe('Button component', () => {
  it('renders button with label', () => {
    render(<Button>Xác nhận</Button>);
    expect(screen.getByRole('button', { name: /Xác nhận/i })).toBeInTheDocument();
  });

  it('renders loading state and disables button', () => {
    render(<Button loading>Đang lưu</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});

