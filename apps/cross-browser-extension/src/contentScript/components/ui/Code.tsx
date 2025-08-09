import React from "react";

interface CodeProps {
  children: React.ReactNode;
  className?: string;
}

const Code: React.FC<CodeProps> = ({ children, className = "" }) => {
  return (
    <code className={`rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] text-blue-600 font-medium ${className}`}>
      {children}
    </code>
  );
};

export default Code;
