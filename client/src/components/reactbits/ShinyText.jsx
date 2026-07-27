import { useState } from 'react';

export default function ShinyText({ text, disabled = false, speed = 5, className = '' }) {
  const animationDuration = `${speed}s`;

  return (
    <span
      className={`shiny-text ${disabled ? 'disabled' : ''} ${className}`}
      style={{ animationDuration }}
    >
      {text}
    </span>
  );
}
