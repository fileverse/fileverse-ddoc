import { Skeleton } from '@fileverse/ui';

export const PreviewContentLoader = () => {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className={` w-[calc(100%-130px)] h-[20px] rounded-sm`} />
      <Skeleton className={` w-[calc(100%-100px)] h-[20px] rounded-sm`} />
      <Skeleton className={` w-[calc(100%-300px)] h-[20px] rounded-sm`} />
      <Skeleton className={` w-[calc(100%-100px)] h-[20px] rounded-sm`} />
      <Skeleton className={` w-[calc(100%-50px)] h-[20px] rounded-sm`} />
      <Skeleton className={` w-[calc(100%-130px)] h-[20px] rounded-sm`} />
      <Skeleton className={` w-[calc(100%-300px)] h-[20px] rounded-sm`} />
      <Skeleton className={` w-[calc(100%-130px)] h-[20px] rounded-sm`} />
      <Skeleton className={` w-[calc(100%-100px)] h-[20px] rounded-sm`} />
      <Skeleton className={` w-[calc(100%-300px)] h-[20px] rounded-sm`} />
      <Skeleton className={` w-[calc(100%-130px)] h-[20px] rounded-sm`} />
      <Skeleton className={` w-[calc(100%-50px)] h-[20px] rounded-sm`} />
      <Skeleton className={` w-[calc(100%-100px)] h-[20px] rounded-sm`} />
      <Skeleton className={` w-[calc(100%-300px)] h-[20px] rounded-sm`} />
    </div>
  );
};
