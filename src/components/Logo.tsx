export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <img
      src="/icon.png"
      alt=""
      aria-hidden="true"
      className={`object-cover ${className}`}
    />
  );
}
