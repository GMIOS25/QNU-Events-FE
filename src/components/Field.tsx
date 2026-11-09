import React from 'react';

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ label, id, error, hint, className = '', required, ...props }, ref) => {
    const fieldId = id || props.name || Math.random().toString(36).substring(2, 9);
    const errorId = `${fieldId}-error`;
    const hintId = `${fieldId}-hint`;

    return (
      <div className="w-full flex flex-col gap-1 text-left">
        <label htmlFor={fieldId} className="text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
        </label>
        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`w-full px-3.5 py-2 rounded-lg border text-sm transition-colors outline-none focus:ring-2 focus:ring-offset-0 ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200 bg-red-50/30'
              : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200 bg-white'
          } ${className}`}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-slate-500">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs font-medium text-red-600 flex items-center gap-1">
            <span aria-hidden="true">⚠</span> {error}
          </p>
        )}
      </div>
    );
  }
);

Field.displayName = 'Field';

