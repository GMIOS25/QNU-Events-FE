import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from '../components/StatusBadge';

describe('StatusBadge component', () => {
  it('renders status text and icon for PUBLISHED', () => {
    render(<StatusBadge status="PUBLISHED" />);
    expect(screen.getByText('Đã công bố')).toBeInTheDocument();
  });

  it('renders status text and icon for DRAFT', () => {
    render(<StatusBadge status="DRAFT" />);
    expect(screen.getByText('Bản nháp')).toBeInTheDocument();
  });

  it('renders status text for REGISTERED', () => {
    render(<StatusBadge status="REGISTERED" />);
    expect(screen.getByText('Đã đăng ký')).toBeInTheDocument();
  });
});

