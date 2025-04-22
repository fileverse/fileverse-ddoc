import { useRef } from 'react';
import Lottie from '@lottielab/lottie-player/react';
import animationData from '../../assets/Reminder-json-no-watermark.json';
import { cn } from '@fileverse/ui';

interface ReminderLottieProps {
  className?: string;
}

export const ReminderLottie = ({ className }: ReminderLottieProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className={cn('w-full h-full', className)}>
      <Lottie lottie={animationData} autoplay loop />
    </div>
  );
};
