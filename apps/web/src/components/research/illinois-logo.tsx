import React from "react";

interface BlockILogoProps {
  className?: string;
  size?: number | string;
  withOutline?: boolean;
}

/**
 * Official University of Illinois Urbana-Champaign Block "I" Logo
 * Brand Colors:
 * - Illini Orange: #FF5F05 (rgb(255, 95, 5))
 * - Illini Blue: #13294B (rgb(19, 41, 75))
 */
export function BlockILogo({
  className = "w-7 h-9",
  size,
  withOutline = true,
}: BlockILogoProps) {
  return (
    <svg
      viewBox="0 0 100 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: typeof size === "number" ? size * 1.28 : size } : undefined}
      aria-label="University of Illinois Block I Logo"
    >
      {/* Outer Border for contrast on dark/light backgrounds */}
      {withOutline && (
        <path
          d="M 2,2 L 98,2 L 98,28 L 72,28 L 72,100 L 98,100 L 98,126 L 2,126 L 2,100 L 28,100 L 28,28 L 2,28 Z"
          fill="#13294B"
          stroke="#FFFFFF"
          strokeWidth="3"
        />
      )}
      {/* Main Inner Block I in Illini Orange */}
      <path
        d="M 6,6 L 94,6 L 94,24 L 68,24 L 68,104 L 94,104 L 94,122 L 6,122 L 6,104 L 32,104 L 32,24 L 6,24 Z"
        fill="#FF5F05"
      />
    </svg>
  );
}
