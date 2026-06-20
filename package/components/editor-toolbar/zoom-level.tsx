import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  LucideIcon,
} from '@fileverse/ui';
import { zoomLevels } from '../../constants/zoom';

interface ZoomLevelDropdownProps {
  zoomLevel: string;
  setZoomLevel: (zoom: string) => void;
}

export const ZoomLevelDropdown = ({
  zoomLevel,
  setZoomLevel,
}: ZoomLevelDropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="bg-transparent hover:!color-bg-default-hover rounded p-2 h-[30px] flex items-center justify-center gap-2 w-fit tabular-nums">
          <span className="text-body-sm-bold line-clamp-1 w-fit">
            {zoomLevels.find((z) => z.value === zoomLevel)?.title || '100%'}
          </span>
          <LucideIcon name="ChevronDown" size="sm" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {zoomLevels.map((zoom) => (
          <DropdownMenuItem
            key={zoom.title}
            className="h-8 rounded py-1 px-2 w-full text-left space-x-2 text-sm color-text-default transition"
            onClick={() => {
              setZoomLevel(zoom.value);
            }}
          >
            {zoom.title}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
