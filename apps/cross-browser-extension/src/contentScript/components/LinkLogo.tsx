import React from "react";

interface LinkLogoProps {
  href?: string;
  host?: string;
  className?: string;
  size?: number; // px
}

function getHostname(input?: string): string | null {
  if (!input) return null;
  try {
    const base = typeof window !== "undefined" ? window.location.href : "https://example.com";
    const url = new URL(input, base);
    return url.hostname;
  } catch {
    return null;
  }
}

const LinkLogo: React.FC<LinkLogoProps> = ({ href, host, className, size = 16 }) => {
  const hostname = host || getHostname(href) || "";
  const src = hostname
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`
    : undefined;

  return (
    <img
      src={src}
      alt={hostname || "favicon"}
      width={size}
      height={size}
      className={className || "h-4 w-4"}
      referrerPolicy="no-referrer"
    />
  );
};

export default LinkLogo;


