import React from 'react';
import { cn } from '@dub/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ 
  variant = 'default', 
  className, 
  children, 
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
  
  const variantClasses = {
    default: 'border-transparent bg-gray-900 text-white hover:bg-gray-800',
    secondary: 'border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200',
    destructive: 'border-transparent bg-red-500 text-white hover:bg-red-600',
    outline: 'text-gray-950 border-gray-200'
  };

  return (
    <span
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
