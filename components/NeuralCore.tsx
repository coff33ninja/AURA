// Re-export from split component structure
// Original monolithic file has been split into:
// - neural-core/index.tsx (main component)
// - neural-core/hooks/* (custom hooks for each domain)
// - neural-core/utils/* (utility functions)

export { NeuralCore } from './neural-core';
export type { NeuralCoreHandle, NeuralCoreProps, PoseSettings } from './neural-core';
