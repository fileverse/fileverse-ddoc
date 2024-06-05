import Logo from '../../../assets/mainLogo.png';
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
      <img
        src={Logo}
        alt="Fileverse"
        className={'w-10 h-10 object-cover mr-2 rounded-lg cursor-pointer'}
      />

      <input
        className="custom-input mx-2 focus:outline-none"
        disabled={isPreviewMode}
        type="text"
        placeholder="Untitled"
        defaultValue={metaData.plugin.title || ''}
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
