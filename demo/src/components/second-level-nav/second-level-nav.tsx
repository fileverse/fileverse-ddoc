import { useMemo } from 'react';
import { Editor } from '@tiptap/react';
import { useEditorCommands } from '../../../../package/hooks/use-editor-commands';
import type { MenuBarTree } from './menu-types';
import type { DocumentCapabilities } from './capabilities';
import { projectMenu } from './project-menu';
import {
  ActionRegistry,
  assertTreeResolves,
  mergeRegistries,
  registryToMenuState,
} from './action-registry';
import { MenuBarRenderer } from './menu-renderer';

/** D-C seam: tree, registry and caps are injected — this file knows no doc type. */
export const SecondLevelNav = ({
  tree,
  liveEditor,
  caps,
  appActions,
  onRequiresAuth,
}: {
  tree: MenuBarTree;
  liveEditor: Editor | null;
  caps: DocumentCapabilities;
  appActions: ActionRegistry;
  onRequiresAuth?: () => void;
}) => {
  const editorCommands = useEditorCommands(liveEditor);

  const registry = useMemo(
    () =>
      mergeRegistries(editorCommands as unknown as ActionRegistry, appActions),
    [editorCommands, appActions],
  );

  // Fail-loud on missing wiring — but only when the editor is live: while it
  // is null/destroyed, useEditorCommands returns a keyless disabled Proxy and
  // every editor actionId would look unresolved.
  if (
    import.meta.env.DEV &&
    liveEditor &&
    !liveEditor.isDestroyed &&
    Object.keys(editorCommands).length > 0
  ) {
    // eslint-disable-next-line no-console
    assertTreeResolves(tree, registry);
  }

  const projected = useMemo(
    () =>
      projectMenu(tree, {
        caps: {
          ...caps,
          hasSelection: editorCommands['edit.cut'].isEnabled ?? false,
        },
        state: registryToMenuState(registry),
      }),
    [tree, caps, registry, editorCommands],
  );

  return (
    <MenuBarRenderer
      projected={projected}
      registry={registry}
      onRequiresAuth={onRequiresAuth}
    />
  );
};
