type ActionIconProps = {
  path: string;
  className?: string;
};

export function ActionIcon({ path, className = "h-4 w-4" }: ActionIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
