import { LucideIcon } from '@fileverse/ui';

export const Spinner = ({ size = 'lg' }: { size?: 'sm' | 'md' | 'lg' }) => {
  return (
    <div className="flex items-center justify-center">
      <LucideIcon
        name="LoaderCircle"
        size={size}
        className="animate-spin"
        fill="transparent"
        stroke="currentColor"
      />
    </div>
  );
};
