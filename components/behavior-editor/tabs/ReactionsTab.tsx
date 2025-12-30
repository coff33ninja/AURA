// Extracted from components/BehaviorEditor.tsx

import React, { useState, useCallback } from 'react';
import {
  BodyConfig,
  HandsConfig,
  FacialConfig,
  ReactionsConfig,
  GestureDefinition,
  ReactionDefinition,
  ReactionStep,
} from '../../../types/behaviorTypes';
import { Slider, Toggle, SectionHeader } from '../shared';

export function ReactionsTab({
  config,
  onChange,
  onPreview,
  currentBody,
  currentHands,
  currentFacial,
  availableGestures,
}: {
  config: ReactionsConfig;
  onChange: (config: Partial<ReactionsConfig>) => void;
  onPreview: (name: string) => void;
  currentBody: BodyConfig;
  currentHands: HandsConfig;
  currentFacial: FacialConfig;
  availableGestures: GestureDefinition[];
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newReactionName, setNewReactionName] = useState('');

  const toggleReaction = useCallback((index: number, enabled: boolean) => {
    const reactions: ReactionDefinition[] = [...config.reactions];
    reactions[index] = { ...reactions[index], enabled };
    onChange({ reactions });
  }, [config.reactions, onChange]);

  const handlePreview = useCallback((reaction: ReactionDefinition) => {
    if (reaction.enabled) {
      onPreview(reaction.name);
    }
  }, [onPreview]);

  const addNewReaction = useCallback(() => {
    if (!newReactionName.trim()) return;
    const newReaction: ReactionDefinition = {
      name: newReactionName.trim(),
      enabled: true,
      expressions: [],
      gestures: [],
      posture: 'neutral',
      duration: 2.0,
      mode: 'ACTIVE',
      steps: [],
    };
    onChange({ reactions: [...config.reactions, newReaction] });
    setNewReactionName('');
    setEditingIndex(config.reactions.length);
  }, [newReactionName, config.reactions, onChange]);

  const deleteReaction = useCallback((index: number) => {
    const reactions = [...config.reactions];
    reactions.splice(index, 1);
    onChange({ reactions });
    setEditingIndex(null);
  }, [config.reactions, onChange]);

  const updateReaction = useCallback((index: number, updates: Partial<ReactionDefinition>) => {
    const reactions = [...config.reactions];
    reactions[index] = { ...reactions[index], ...updates };
    onChange({ reactions });
  }, [config.reactions, onChange]);

  // Add a step to the reaction chain
  const addStep = useCallback((index: number, stepType: ReactionStep['type']) => {
    const reactions = [...config.reactions];
    const reaction = reactions[index];
    const steps = reaction.steps || [];
    
    let newStep: ReactionStep;
    switch (stepType) {
      case 'body':
        newStep = {
          type: 'body',
          name: `Body Pose ${steps.length + 1}`,
          delay: 0,
          duration: 1.0,
          bodyConfig: { ...currentBody },
        };
        break;
      case 'hands':
        newStep = {
          type: 'hands',
          name: `Hand Pose ${steps.length + 1}`,
          delay: 0,
          duration: 1.0,
          handsConfig: { ...currentHands },
        };
        break;
      case 'facial':
        newStep = {
          type: 'facial',
          name: `Facial ${steps.length + 1}`,
          delay: 0,
          duration: 1.0,
          facialConfig: {
            expressions: { ...currentFacial.expressions },
            mouth: { ...currentFacial.mouth },
            eyes: { ...currentFacial.eyes },
            customPresets: [],
          },
        };
        break;
      case 'gesture':
        newStep = {
          type: 'gesture',
          name: `Gesture ${steps.length + 1}`,
          delay: 0,
          duration: 1.5,
          gestureName: availableGestures[0]?.name || '',
        };
        break;
      case 'expression':
        newStep = {
          type: 'expression',
          name: `Expression ${steps.length + 1}`,
          delay: 0,
          duration: 1.0,
          expressionName: 'joy',
          expressionValue: 0.8,
        };
        break;
      default:
        return;
    }
    
    reactions[index] = { ...reaction, steps: [...steps, newStep] };
    onChange({ reactions });
  }, [config.reactions, onChange, currentBody, currentHands, currentFacial, availableGestures]);

  // Remove a step from the chain
  const removeStep = useCallback((reactionIndex: number, stepIndex: number) => {
    const reactions = [...config.reactions];
    const reaction = reactions[reactionIndex];
    const steps = [...(reaction.steps || [])];
    steps.splice(stepIndex, 1);
    reactions[reactionIndex] = { ...reaction, steps };
    onChange({ reactions });
  }, [config.reactions, onChange]);

  // Update a step
  const updateStep = useCallback((reactionIndex: number, stepIndex: number, updates: Partial<ReactionStep>) => {
    const reactions = [...config.reactions];
    const reaction = reactions[reactionIndex];
    const steps = [...(reaction.steps || [])];
    steps[stepIndex] = { ...steps[stepIndex], ...updates };
    reactions[reactionIndex] = { ...reaction, steps };
    onChange({ reactions });
  }, [config.reactions, onChange]);

  // Move step up/down in chain
  const moveStep = useCallback((reactionIndex: number, stepIndex: number, direction: 'up' | 'down') => {
    const reactions = [...config.reactions];
    const reaction = reactions[reactionIndex];
    const steps = [...(reaction.steps || [])];
    const newIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    [steps[stepIndex], steps[newIndex]] = [steps[newIndex], steps[stepIndex]];
    reactions[reactionIndex] = { ...reaction, steps };
    onChange({ reactions });
  }, [config.reactions, onChange]);

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {/* New Reaction */}
      <div>
        <SectionHeader title="Create Reaction" />
        <div className="flex gap-1">
          <input
            type="text"
            value={newReactionName}
            onChange={(e) => setNewReactionName(e.target.value)}
            placeholder="Reaction name"
            className="flex-1 px-1 py-0.5 text-[10px] bg-gray-800 border border-gray-600 rounded text-gray-200"
          />
          <button
            onClick={addNewReaction}
            disabled={!newReactionName.trim()}
            className="px-2 py-0.5 text-[9px] bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
          >
            + New
          </button>
        </div>
      </div>

      {/* Reactions List */}
      <div>
        <SectionHeader title="Reactions" />
        <div className="space-y-1">
          {config.reactions.map((reaction: ReactionDefinition, index: number) => (
            <div
              key={reaction.name}
              className={`rounded border ${
                reaction.enabled
                  ? 'border-cyan-500/30 bg-gray-800/50'
                  : 'border-gray-600/30 bg-gray-800/20 opacity-60'
              }`}
            >
              {/* Reaction Header */}
              <div className="p-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Toggle
                    label=""
                    checked={reaction.enabled}
                    onChange={(enabled) => toggleReaction(index, enabled)}
                  />
                  <div>
                    <span className="text-[10px] font-medium text-gray-200">{reaction.name}</span>
                    <span className={`ml-1 text-[8px] px-1 py-0.5 rounded ${
                      reaction.mode === 'ACTIVE' 
                        ? 'bg-green-700/50 text-green-300' 
                        : 'bg-blue-700/50 text-blue-300'
                    }`}>
                      {reaction.mode}
                    </span>
                    {reaction.steps && reaction.steps.length > 0 && (
                      <span className="ml-1 text-[8px] text-gray-400">
                        ({reaction.steps.length} steps)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                    className="px-1.5 py-0.5 text-[9px] bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
                  >
                    {editingIndex === index ? '▼' : '✎'}
                  </button>
                  <button
                    onClick={() => handlePreview(reaction)}
                    disabled={!reaction.enabled}
                    className="px-1.5 py-0.5 text-[9px] bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded"
                  >
                    ▶
                  </button>
                </div>
              </div>

              {/* Edit Mode */}
              {editingIndex === index && (
                <div className="px-2 pb-2 border-t border-gray-700/50 pt-2 space-y-2">
                  {/* Mode Toggle */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateReaction(index, { mode: 'ACTIVE' })}
                      className={`flex-1 px-2 py-0.5 text-[9px] rounded ${
                        reaction.mode === 'ACTIVE' ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      ACTIVE
                    </button>
                    <button
                      onClick={() => updateReaction(index, { mode: 'PASSIVE' })}
                      className={`flex-1 px-2 py-0.5 text-[9px] rounded ${
                        reaction.mode === 'PASSIVE' ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      PASSIVE
                    </button>
                  </div>

                  {/* Duration */}
                  <Slider
                    label="Duration"
                    value={reaction.duration}
                    min={0.5}
                    max={10}
                    step={0.5}
                    onChange={(duration) => updateReaction(index, { duration })}
                  />

                  {/* Chain Steps */}
                  <div>
                    <div className="text-[9px] text-cyan-400 mb-1">Chain Steps</div>
                    <div className="text-[8px] text-gray-400 mb-2">
                      Add steps from current Body/Hands/Facial configs
                    </div>
                    
                    {/* Add Step Buttons */}
                    <div className="flex gap-1 flex-wrap mb-2">
                      <button
                        onClick={() => addStep(index, 'body')}
                        className="px-2 py-0.5 text-[8px] bg-purple-700/50 hover:bg-purple-600 text-white rounded"
                      >
                        + Body
                      </button>
                      <button
                        onClick={() => addStep(index, 'hands')}
                        className="px-2 py-0.5 text-[8px] bg-orange-700/50 hover:bg-orange-600 text-white rounded"
                      >
                        + Hands
                      </button>
                      <button
                        onClick={() => addStep(index, 'facial')}
                        className="px-2 py-0.5 text-[8px] bg-pink-700/50 hover:bg-pink-600 text-white rounded"
                      >
                        + Facial
                      </button>
                      <button
                        onClick={() => addStep(index, 'gesture')}
                        className="px-2 py-0.5 text-[8px] bg-green-700/50 hover:bg-green-600 text-white rounded"
                      >
                        + Gesture
                      </button>
                      <button
                        onClick={() => addStep(index, 'expression')}
                        className="px-2 py-0.5 text-[8px] bg-yellow-700/50 hover:bg-yellow-600 text-white rounded"
                      >
                        + Expression
                      </button>
                    </div>

                    {/* Steps List */}
                    {reaction.steps && reaction.steps.length > 0 && (
                      <div className="space-y-1">
                        {reaction.steps.map((step, stepIndex) => (
                          <div
                            key={stepIndex}
                            className={`p-1.5 rounded border text-[9px] ${
                              step.type === 'body' ? 'border-purple-500/30 bg-purple-900/20' :
                              step.type === 'hands' ? 'border-orange-500/30 bg-orange-900/20' :
                              step.type === 'facial' ? 'border-pink-500/30 bg-pink-900/20' :
                              step.type === 'gesture' ? 'border-green-500/30 bg-green-900/20' :
                              'border-yellow-500/30 bg-yellow-900/20'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-200">
                                {stepIndex + 1}. {step.type.toUpperCase()}: {step.name}
                              </span>
                              <div className="flex gap-0.5">
                                <button
                                  onClick={() => moveStep(index, stepIndex, 'up')}
                                  disabled={stepIndex === 0}
                                  className="px-1 text-[8px] bg-gray-700 hover:bg-gray-600 disabled:opacity-30 rounded"
                                >
                                  ↑
                                </button>
                                <button
                                  onClick={() => moveStep(index, stepIndex, 'down')}
                                  disabled={stepIndex === reaction.steps!.length - 1}
                                  className="px-1 text-[8px] bg-gray-700 hover:bg-gray-600 disabled:opacity-30 rounded"
                                >
                                  ↓
                                </button>
                                <button
                                  onClick={() => removeStep(index, stepIndex)}
                                  className="px-1 text-[8px] bg-red-700/50 hover:bg-red-600 rounded"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <span className="text-gray-400">Delay:</span>
                                <input
                                  type="number"
                                  value={step.delay}
                                  onChange={(e) => updateStep(index, stepIndex, { delay: parseFloat(e.target.value) || 0 })}
                                  className="w-12 ml-1 px-1 bg-gray-800 border border-gray-600 rounded text-gray-200"
                                  step="0.1"
                                  min="0"
                                  aria-label="Step delay in seconds"
                                />
                                <span className="text-gray-500">s</span>
                              </div>
                              <div className="flex-1">
                                <span className="text-gray-400">Duration:</span>
                                <input
                                  type="number"
                                  value={step.duration}
                                  onChange={(e) => updateStep(index, stepIndex, { duration: parseFloat(e.target.value) || 1 })}
                                  className="w-12 ml-1 px-1 bg-gray-800 border border-gray-600 rounded text-gray-200"
                                  step="0.1"
                                  min="0.1"
                                  aria-label="Step duration in seconds"
                                />
                                <span className="text-gray-500">s</span>
                              </div>
                            </div>
                            {/* Gesture selector */}
                            {step.type === 'gesture' && (
                              <div className="mt-1">
                                <select
                                  value={step.gestureName || ''}
                                  onChange={(e) => updateStep(index, stepIndex, { gestureName: e.target.value })}
                                  className="w-full px-1 py-0.5 bg-gray-800 border border-gray-600 rounded text-gray-200 text-[9px]"
                                  aria-label="Select gesture"
                                >
                                  {availableGestures.map((g) => (
                                    <option key={g.name} value={g.name}>{g.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {/* Expression selector */}
                            {step.type === 'expression' && (
                              <div className="mt-1 flex gap-1">
                                <select
                                  value={step.expressionName || 'joy'}
                                  onChange={(e) => updateStep(index, stepIndex, { expressionName: e.target.value })}
                                  className="flex-1 px-1 py-0.5 bg-gray-800 border border-gray-600 rounded text-gray-200 text-[9px]"
                                  aria-label="Select expression"
                                >
                                  {['joy', 'angry', 'sorrow', 'fun', 'surprised', 'blink'].map((e) => (
                                    <option key={e} value={e}>{e}</option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  value={step.expressionValue || 0.8}
                                  onChange={(e) => updateStep(index, stepIndex, { expressionValue: parseFloat(e.target.value) || 0 })}
                                  className="w-14 px-1 bg-gray-800 border border-gray-600 rounded text-gray-200"
                                  step="0.1"
                                  min="0"
                                  max="1"
                                  aria-label="Expression intensity"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {(!reaction.steps || reaction.steps.length === 0) && (
                      <div className="text-[8px] text-gray-500 text-center py-2">
                        No steps yet. Configure Body/Hands/Facial tabs, then click + to capture.
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteReaction(index)}
                    className="w-full mt-2 px-2 py-1 text-[9px] bg-red-700/50 hover:bg-red-600 text-white rounded"
                  >
                    Delete Reaction
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
