import React from 'react';
import { CheckCircle2, Clock, XCircle, FileEdit, AlertCircle } from 'lucide-react';

export type StatusType =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'CANCELLED'
  | 'REGISTERED'
  | 'ATTENDED'
  | 'ABSENT'
  | 'ACTIVE'
  | 'LOCKED';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const configs: Record<
    string,
    { label: string; icon: React.ReactNode; bg: string; text: string; border: string }
  > = {
    DRAFT: {
      label: 'Bản nháp',
      icon: <FileEdit className="w-3.5 h-3.5" aria-hidden="true" />,
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
    },
    PUBLISHED: {
      label: 'Đã công bố',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />,
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
    },
    CANCELLED: {
      label: 'Đã hủy',
      icon: <XCircle className="w-3.5 h-3.5 text-red-600" aria-hidden="true" />,
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-200',
    },
    REGISTERED: {
      label: 'Đã đăng ký',
      icon: <Clock className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />,
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
    },
    ACCEPTED: {
      label: 'Đã điểm danh',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />,
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
    },
    NOT_CHECKED_IN: {
      label: 'Chưa điểm danh',
      icon: <Clock className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />,
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
    },
    ATTENDED: {
      label: 'Đã tham gia',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />,
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-200',
    },
    ABSENT: {
      label: 'Vắng mặt',
      icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />,
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
    },
    ACTIVE: {
      label: 'Hoạt động',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />,
      bg: 'bg-green-50',
      text: 'text-green-800',
      border: 'border-green-200',
    },
    LOCKED: {
      label: 'Đã khóa',
      icon: <XCircle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />,
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
    },
  };

  const current = configs[status] || {
    label: status,
    icon: <AlertCircle className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${current.bg} ${current.text} ${current.border} ${className}`}
    >
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
};

