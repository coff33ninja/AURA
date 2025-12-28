// AIInstructionGenerator Service
// Generates dynamic AI system instructions based on loaded behavior configs

import {
  ModelBehaviors,
  GestureDefinition,
  ReactionDefinition,
} from '../types/behaviorTypes';

/**
 * Get list of enabled expressions from behaviors
 */
export function getEnabledExpressions(behaviors: ModelBehaviors): string[] {
  const expressions: string[] = [];
  
  // Add mapped expressions
  if (behaviors.expressions.mappings) {
    for (const [standardName, modelName] of Object.entries(behaviors.expressions.mappings)) {
      if (modelName) {
        expressions.push(standardName);
      }
    }
  }
  
  // Add expression combos
  if (behaviors.expressions.combos) {
    for (const combo of behaviors.expressions.combos) {
      if (combo.name) {
        expressions.push(combo.name);
      }
    }
  }
  
  return [...new Set(expressions)]; // Remove duplicates
}

/**
 * Get list of enabled gestures from behaviors
 */
export function getEnabledGestures(behaviors: ModelBehaviors): string[] {
  return behaviors.gestures.gestures
    .filter((g: GestureDefinition) => g.enabled)
    .map((g: GestureDefinition) => g.name);
}

/**
 * Get list of enabled reactions from behaviors
 */
export function getEnabledReactions(behaviors: ModelBehaviors): string[] {
  return behaviors.reactions.reactions
    .filter((r: ReactionDefinition) => r.enabled)
    .map((r: ReactionDefinition) => r.name);
}

/**
 * Generate the command list section for AI instructions
 */
export function generateCommandList(behaviors: ModelBehaviors): string {
  const lines: string[] = [];
  
  // Expressions section
  const expressions = getEnabledExpressions(behaviors);
  if (expressions.length > 0) {
    lines.push('## Available Expressions');
    lines.push('Use [expression:NAME:INTENSITY] to show an expression (intensity 0.0-1.0)');
    lines.push(`Available: ${expressions.join(', ')}`);
    
    // Add intensity overrides info if present
    if (behaviors.expressions.intensityOverrides) {
      const overrides = Object.entries(behaviors.expressions.intensityOverrides)
        .filter(([_, max]) => max < 1.0)
        .map(([name, max]) => `${name} (max: ${max})`);
      if (overrides.length > 0) {
        lines.push(`Note: Some expressions have intensity limits: ${overrides.join(', ')}`);
      }
    }
    lines.push('');
  }
  
  // Gestures section
  const gestures = getEnabledGestures(behaviors);
  if (gestures.length > 0) {
    lines.push('## Available Gestures');
    lines.push('Use [gesture:NAME] to perform a gesture');
    lines.push(`Available: ${gestures.join(', ')}`);
    lines.push('');
  }
  
  // Reactions section
  const reactions = getEnabledReactions(behaviors);
  if (reactions.length > 0) {
    lines.push('## Available Reactions');
    lines.push('Use [reaction:NAME] to trigger an emotional reaction');
    lines.push(`Available: ${reactions.join(', ')}`);
    
    // Add mode info for reactions
    const activeReactions = behaviors.reactions.reactions
      .filter(r => r.enabled && r.mode === 'ACTIVE')
      .map(r => r.name);
    const passiveReactions = behaviors.reactions.reactions
      .filter(r => r.enabled && r.mode === 'PASSIVE')
      .map(r => r.name);
    
    if (activeReactions.length > 0) {
      lines.push(`Active (user-triggered): ${activeReactions.join(', ')}`);
    }
    if (passiveReactions.length > 0) {
      lines.push(`Passive (ambient): ${passiveReactions.join(', ')}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Generate full system instruction from behaviors
 */
export function generate(behaviors: ModelBehaviors): string {
  const lines: string[] = [];
  
  lines.push(`# Avatar Control Instructions for ${behaviors.modelName}`);
  lines.push('');
  lines.push('You control a VRM avatar. Use the following commands inline with your speech to animate the avatar.');
  lines.push('Commands are processed in real-time as you speak.');
  lines.push('');
  
  // Add command list
  lines.push(generateCommandList(behaviors));
  
  // Add usage hints
  lines.push('## Usage Tips');
  lines.push('- Combine expressions with speech naturally: "I\'m so happy! [expression:happy:0.8]"');
  lines.push('- Use gestures to emphasize points: "[gesture:wave] Hello there!"');
  lines.push('- Reactions are for emotional responses: "[reaction:surprised] Wow, I didn\'t expect that!"');
  lines.push('- Keep intensity values between 0.0 and 1.0');
  lines.push('- Multiple commands can be used in sequence');
  lines.push('');
  
  // Add idle behavior info
  if (behaviors.idle.preset !== 'custom') {
    lines.push(`## Current Mood: ${behaviors.idle.preset}`);
    lines.push('The avatar\'s idle animations reflect this mood.');
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Generate a minimal instruction set (for token efficiency)
 */
export function generateMinimal(behaviors: ModelBehaviors): string {
  const expressions = getEnabledExpressions(behaviors);
  const gestures = getEnabledGestures(behaviors);
  const reactions = getEnabledReactions(behaviors);
  
  const parts: string[] = [];
  
  if (expressions.length > 0) {
    parts.push(`Expressions [expression:NAME:0-1]: ${expressions.join(', ')}`);
  }
  if (gestures.length > 0) {
    parts.push(`Gestures [gesture:NAME]: ${gestures.join(', ')}`);
  }
  if (reactions.length > 0) {
    parts.push(`Reactions [reaction:NAME]: ${reactions.join(', ')}`);
  }
  
  return parts.join('\n');
}
