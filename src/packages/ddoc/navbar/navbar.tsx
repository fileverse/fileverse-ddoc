import { PluginMetaData } from '../types';

export const PluginNavbarLeftSection = ({
  metaData,
  setMetaData,
  isPreviewMode,
}: {
  metaData: PluginMetaData;
  setMetaData: React.Dispatch<React.SetStateAction<PluginMetaData>>;
  isPreviewMode: boolean;
}) => {
  return (
    <div className="flex items-center gap-4">
      <input
        className="custom-input mx-2 focus:outline-none bg-[#f8f9fa]"
        disabled={isPreviewMode}
        type="text"
        placeholder="Untitled"
        value={metaData.plugin.title || ''}
        onChange={(e) =>
          setMetaData({
            ...metaData,
            plugin: { ...metaData.plugin, title: e.target.value },
          })
        }
      />
    </div>
  );
};
