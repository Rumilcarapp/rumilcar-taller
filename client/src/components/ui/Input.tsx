import React, { forwardRef } from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  icon,
  suffix,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`input-group ${error ? 'input-error' : ''} ${className}`}>
      {label && <label htmlFor={inputId} className="input-label">{label}</label>}
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          ref={ref}
          id={inputId}
          className={`input-field ${icon ? 'has-icon' : ''} ${suffix ? 'has-suffix' : ''}`}
          {...props}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
      {error && <span className="input-error-text">{error}</span>}
      {hint && !error && <span className="input-hint">{hint}</span>}
    </div>
  );
});

Input.displayName = 'Input';