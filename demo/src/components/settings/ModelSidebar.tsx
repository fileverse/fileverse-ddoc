import ModelSettings from './ModelSettings';
import { DynamicDrawer } from '@fileverse/ui';

interface ModelSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModelSidebar = ({ isOpen, onClose }: ModelSidebarProps) => {
  return (
    <DynamicDrawer
      open={isOpen}
      onOpenChange={onClose}
      title="Model Settings"
      content={
        <div className="py-4">
          <ModelSettings />
        </div>
      }
    />
  );
};

export default ModelSidebar;
