import { Extension } from '@tiptap/core';

// Keyboard shortcuts for superscript (Cmd/Ctrl+Shift+^) and subscript
// (Cmd/Ctrl+Shift+Alt+^), added alongside the extensions' default Mod+. / Mod+,
// bindings. Both the `6`-keycode and the `^`-character variants are bound for
// cross-platform coverage (`^` is a Shift-produced character and Alt mangles
// `event.key` on macOS).
export const SuperscriptSubscriptControls = Extension.create({
  name: 'superscriptSubscriptControls',

  addKeyboardShortcuts() {
    const toggleSuperscript = () =>
      this.editor.chain().unsetSubscript().toggleSuperscript().run();
    const toggleSubscript = () =>
      this.editor.chain().unsetSuperscript().toggleSubscript().run();

    return {
      'Mod-Shift-6': toggleSuperscript,
      'Mod-Shift-^': toggleSuperscript,
      'Mod-Shift-Alt-6': toggleSubscript,
      'Mod-Shift-Alt-^': toggleSubscript,
    };
  },
});
