// Re-export from split component structure
// Original monolithic file has been split into:
// - behavior-editor/index.tsx (main component)
// - behavior-editor/tabs/* (individual tab components)
// - behavior-editor/shared/* (shared UI components)

export { BehaviorEditor } from './behavior-editor';
export type { BehaviorEditorProps } from './behavior-editor';
