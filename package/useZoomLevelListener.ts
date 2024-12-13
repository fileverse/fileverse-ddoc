import { useEffect } from 'react';
import { AnyExtension } from '@tiptap/react';

export function useZoomLevelListener({
  zoomLevel,
  setExtensions,
  defaultExtensions,
  onError,
  secureImageUploadUrl,
  customTextInputRules,
  SlashCommand,
  PageBreak,
}: {
  zoomLevel: string | undefined;
  setExtensions: React.Dispatch<React.SetStateAction<AnyExtension[]>>;
  defaultExtensions: (
    zoomLevel: string,
    errorHandler: (error: string) => void,
    secureImageUploadUrl?: string,
  ) => AnyExtension[];
  onError?: (error: string) => void;
  secureImageUploadUrl?: string;
  customTextInputRules: AnyExtension;
  SlashCommand: (
    errorHandler: (error: string) => void,
    secureImageUploadUrl: string,
  ) => AnyExtension;
  PageBreak: AnyExtension;
}) {
  useEffect(() => {
    if (zoomLevel) {
      setExtensions([
        ...(defaultExtensions(
          zoomLevel as string,
          (error: string) => onError?.(error),
          secureImageUploadUrl,
        ) as AnyExtension[]),
        SlashCommand(
          (error: string) => onError?.(error),
          secureImageUploadUrl ?? '',
        ),
        customTextInputRules,
        PageBreak,
      ]);
    }
  }, [zoomLevel]);
}
