import { useId } from "react";

// The app logo: the Hangul letter 한 on an indigo tile. Same artwork as public/favicon.svg and the app icons.
const HAN = "M40.9 36.9C33.0 36.9 27.4 41.3 27.4 47.5C27.4 53.8 33.0 58.1 40.9 58.1C48.8 58.1 54.4 53.8 54.4 47.5C54.4 41.3 48.8 36.9 40.9 36.9ZM40.9 42.9C44.4 42.9 46.8 44.5 46.8 47.5C46.8 50.5 44.4 52.1 40.9 52.1C37.4 52.1 35.0 50.5 35.0 47.5C35.0 44.5 37.4 42.9 40.9 42.9ZM60.0 23.1V64.1H67.9V46.3H75.2V39.8H67.9V23.1ZM37.0 23.0V28.8H24.8V35.0H57.0V28.8H44.8V23.0ZM32.5 61.0V77.0H69.9V70.7H40.5V61.0Z";

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
        <radialGradient id={`${id}h`} cx=".25" cy=".15" r=".8">
          <stop offset="0" stopColor="#fff" stopOpacity=".28" />
          <stop offset=".6" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill={`url(#${id}g)`} />
      <rect width="100" height="100" rx="24" fill={`url(#${id}h)`} />
      <path d={HAN} fill="#fff" />
    </svg>
  );
}
