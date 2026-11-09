import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  code?: string;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  code,
  onDismiss,
  className = '',
}) => {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 ${className}`}
    >
      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-red-900">{message}</p>
        {code && <p className="text-xs text-red-600 mt-0.5">Mã lỗi: {code}</p>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-100 transition-colors"
          aria-label="Đóng thông báo lỗi"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

