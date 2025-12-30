// BehaviorEditor - Visual editor for VRM behavior configurations
// Provides tabbed interface for editing transform, expressions, gestures, idle, lipsync, reactions

import { useState, useCallback } from 'react';
import {
  BehaviorType,
  ModelBehaviors,
  TransformConfig,
  BodyConfig,
  HandsConfig,
  FacialConfig,
  GesturesConfig,
  IdleConfig,
  LipSyncConfig,
  ReactionsConfig,
  ExpressionsConfig,
  GestureDefinition,
} from '../../types/behaviorTypes';
import type { BackgroundConfig } from '../../types/enhancementTypes';
import type { WalkingBehaviorConfig } from '../../types/walkingBehaviorTypes';
import { WalkingEditor } from '../WalkingEditor';

// Import all tabs from barrel export
import {
  TransformTab,
  BodyTab,
  HandsTab,
  FacialTab,
  ExpressionsTab,
  GesturesTab,
  IdleTab,
  LipSyncTab,
  ReactionsTab,
  BackgroundTab,
  ImportExportTab,
} from './tabs';

export interface BehaviorEditorProps {
  isOpen: boolean;
  onClose: () => void;
  modelName: string;
  behaviors: ModelBehaviors | null;
  onBehaviorChange: (type: BehaviorType, config: Partial<any>) => void;
  onPreviewGesture: (gestureName: string) => void;
  onPreviewExpression: (expressionName: string, value: number) => void;
  onPreviewReaction: (reactionName: string) => void;
  onSetBoneRotation?: (boneName: string, rotation: { x: number; y: number; z: number }) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onSave: () => void;
  backgroundConfig?: BackgroundConfig;
  onBackgroundChange?: (config: BackgroundConfig) => void;
  walkingConfig?: WalkingBehaviorConfig;
  onWalkingChange?: (config: Partial<WalkingBehaviorConfig>) => void;
  isWalking?: boolean;
  onStartWalking?: () => void;
  onStopWalking?: () => void;
}

type TabType = 'transform' | 'body' | 'hands' | 'facial' | 'expressions' | 'gestures' | 'idle' | 'lipsync' | 'reactions' | 'walking' | 'background' | 'import-export';

const TABS: { id: TabType; label: string }[] = [
  { id: 'transform', label: 'Transform' },
  { id: 'body', label: 'Body' },
  { id: 'hands', label: 'Hands' },
  { id: 'facial', label: 'Facial' },
  { id: 'expressions', label: 'Expressions' },
  { id: 'gestures', label: 'Gestures' },
  { id: 'idle', label: 'Idle' },
  { id: 'lipsync', label: 'Lip Sync' },
  { id: 'reactions', label: 'Reactions' },
  { id: 'walking', label: 'Walking' },
  { id: 'background', label: 'Background' },
  { id: 'import-export', label: 'Import/Export' },
];

export function BehaviorEditor({
  isOpen,
  onClose,
  modelName,
  behaviors,
  onBehaviorChange,
  onPreviewGesture,
  onPreviewExpression,
  onPreviewReaction,
  onSetBoneRotation,
  onExport,
  onImport,
  onSave,
  backgroundConfig,
  onBackgroundChange,
  walkingConfig,
  onWalkingChange,
  isWalking = false,
  onStartWalking,
  onStopWalking,
}: BehaviorEditorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('transform');

  // Memoized handlers to prevent unnecessary re-renders
  const handleTransformChange = useCallback(
    (config: Partial<TransformConfig>) => onBehaviorChange('transform', config),
    [onBehaviorChange]
  );

  const handleBodyChange = useCallback(
    (config: Partial<BodyConfig>) => onBehaviorChange('body', config),
    [onBehaviorChange]
  );

  const handleHandsChange = useCallback(
    (config: Partial<HandsConfig>) => onBehaviorChange('hands', config),
    [onBehaviorChange]
  );

  const handleFacialChange = useCallback(
    (config: Partial<FacialConfig>) => onBehaviorChange('facial', config),
    [onBehaviorChange]
  );

  const handleExpressionsChange = useCallback(
    (config: Partial<ExpressionsConfig>) => onBehaviorChange('expressions', config),
    [onBehaviorChange]
  );

  const handleGesturesChange = useCallback(
    (config: Partial<GesturesConfig>) => onBehaviorChange('gestures', config),
    [onBehaviorChange]
  );

  const handleIdleChange = useCallback(
    (config: Partial<IdleConfig>) => onBehaviorChange('idle', config),
    [onBehaviorChange]
  );

  const handleLipSyncChange = useCallback(
    (config: Partial<LipSyncConfig>) => onBehaviorChange('lipsync', config),
    [onBehaviorChange]
  );

  const handleReactionsChange = useCallback(
    (config: Partial<ReactionsConfig>) => onBehaviorChange('reactions', config),
    [onBehaviorChange]
  );

  if (!isOpen) return null;

  return (
    <div className="hud-panel h-full flex flex-col bg-gray-900/90 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-cyan-500/20">
        <h2 className="text-xs font-semibold text-cyan-400 tracking-wide">
          {modelName}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          ✕
        </button>
      </div>

      {/* Tabs - compact horizontal scroll */}
      <div className="flex border-b border-cyan-500/20 px-1 overflow-x-auto scrollbar-thin">
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-2 py-1.5 text-[10px] font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 text-xs">
        {!behaviors ? (
          <div className="text-gray-400 text-center py-4">
            No behaviors loaded.
          </div>
        ) : (
          <>
            {activeTab === 'transform' && (
              <TransformTab
                config={behaviors.transform}
                onChange={handleTransformChange}
              />
            )}
            {activeTab === 'body' && (
              <BodyTab
                config={behaviors.body}
                onChange={handleBodyChange}
              />
            )}
            {activeTab === 'hands' && (
              <HandsTab
                config={behaviors.hands}
                onChange={handleHandsChange}
                onSaveAsGesture={(name: string, bones: Record<string, { x: number; y: number; z: number }>) => {
                  const newGesture: GestureDefinition = {
                    name,
                    enabled: true,
                    duration: 1.5,
                    intensity: 1.0,
                    transitionSpeed: 0.3,
                    bones,
                  };
                  handleGesturesChange({ gestures: [...behaviors.gestures.gestures, newGesture] });
                }}
              />
            )}
            {activeTab === 'facial' && (
              <FacialTab
                config={behaviors.facial}
                onChange={handleFacialChange}
              />
            )}
            {activeTab === 'expressions' && (
              <ExpressionsTab
                config={behaviors.expressions}
                onChange={handleExpressionsChange}
                onPreview={onPreviewExpression}
              />
            )}
            {activeTab === 'gestures' && (
              <GesturesTab
                config={behaviors.gestures}
                onChange={handleGesturesChange}
                onPreview={onPreviewGesture}
                onSetBoneRotation={onSetBoneRotation}
              />
            )}
            {activeTab === 'idle' && (
              <IdleTab
                config={behaviors.idle}
                onChange={handleIdleChange}
              />
            )}
            {activeTab === 'lipsync' && (
              <LipSyncTab
                config={behaviors.lipsync}
                onChange={handleLipSyncChange}
              />
            )}
            {activeTab === 'reactions' && (
              <ReactionsTab
                config={behaviors.reactions}
                onChange={handleReactionsChange}
                onPreview={onPreviewReaction}
                currentBody={behaviors.body}
                currentHands={behaviors.hands}
                currentFacial={behaviors.facial}
                availableGestures={behaviors.gestures.gestures}
              />
            )}
            {activeTab === 'walking' && walkingConfig && onWalkingChange && onStartWalking && onStopWalking && (
              <WalkingEditor
                config={walkingConfig}
                onChange={onWalkingChange}
                isWalking={isWalking}
                onStartWalking={onStartWalking}
                onStopWalking={onStopWalking}
              />
            )}
            {activeTab === 'background' && (
              <BackgroundTab
                config={backgroundConfig}
                onChange={onBackgroundChange}
              />
            )}
            {activeTab === 'import-export' && (
              <ImportExportTab onExport={onExport} onImport={onImport} />
            )}
          </>
        )}
      </div>

      {/* Footer - compact */}
      <div className="flex justify-end gap-2 px-2 py-1.5 border-t border-cyan-500/20">
        <button
          type="button"
          onClick={onSave}
          className="px-3 py-1 text-[10px] bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// Re-export tabs for external use
export * from './tabs';
export * from './shared';
