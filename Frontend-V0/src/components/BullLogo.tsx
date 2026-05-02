import React from 'react';

export default function BullLogo({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bull head silhouette */}
      <path
        d="M4 8L8 4L10 8L12 6L16 10L20 6L22 8L24 4L28 8L26 14L24 16L26 22L24 28L20 28L18 24L16 26L14 24L12 28L8 28L6 22L8 16L6 14L4 8Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      {/* Left horn */}
      <path
        d="M4 8L8 4L10 8L8 10L6 10L4 8Z"
        fill="currentColor"
      />
      {/* Right horn */}
      <path
        d="M28 8L24 4L22 8L24 10L26 10L28 8Z"
        fill="currentColor"
      />
      {/* Nose ring */}
      <circle cx="16" cy="22" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
    </svg>
  );
}
