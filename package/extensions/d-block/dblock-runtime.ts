export interface DBlockRuntimeState {
  isPreviewMode: boolean;
  isPresentationMode: boolean;
  isPreviewEditor: boolean;
  isCollaboratorsDoc: boolean;
  isSplitView: boolean;
}

export const DEFAULT_DBLOCK_RUNTIME_STATE: DBlockRuntimeState = {
  isPreviewMode: false,
  isPresentationMode: false,
  isPreviewEditor: false,
  isCollaboratorsDoc: false,
  isSplitView: false,
};

export type DBlockRuntimeStateRef = {
  current: DBlockRuntimeState;
};

export const getDBlockRuntimeState = (
  getRuntimeState?: () => DBlockRuntimeState,
) => getRuntimeState?.() ?? DEFAULT_DBLOCK_RUNTIME_STATE;
