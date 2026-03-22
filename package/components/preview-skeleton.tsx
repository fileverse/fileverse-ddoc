import { cn } from '@fileverse/ui';

const className =
  'h-6 bg-gradient-to-r [--from:210,_17%,_98%,_1] [--to:0,_0%,_93%,_1] dark:[--from:210,_17%,_9%,_1] dark:[--to:0,_0%,_9%,_1] from-[hsl(var(--from))] to-[hsl(var(--to))]';

const PreviewSkeleton = ({ className: classStyle }: { className?: string }) => {
  return <div className={cn(className, classStyle)}></div>;
};

export { PreviewSkeleton };
