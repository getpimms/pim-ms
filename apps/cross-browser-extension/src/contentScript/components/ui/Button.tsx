import React from 'react';
import { cn } from '@dub/utils';
import { IconLoader2 } from './icons';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  className, 
  children, 
  loading = false,
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variantClasses = {
    primary: 'bg-[#3971ff] text-white hover:bg-blue-600',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    outline: 'border border-gray-200 bg-white hover:bg-gray-50 hover:text-gray-900',
    ghost: 'hover:bg-gray-100 hover:text-gray-900'
  };
  
  const sizeClasses = {
    sm: 'h-9 rounded-md px-3',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 rounded-md px-8'
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};

export default Button;
