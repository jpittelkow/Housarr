# ADR 008: Configurable AI Prompts

## Status

Accepted

## Date

2024-12-30

## Context

The Smart Add feature uses AI prompts to analyze product images and text queries, identifying make, model, and category. When multiple AI agents are used, a synthesis prompt combines their responses into a single result.

Initially, these prompts were hardcoded in the backend:
- `AnalyzeItemImageAction.php` - Smart Add analysis prompt
- `AIAgentOrchestrator.php` - Multi-agent synthesis prompt

Users needed the ability to customize these prompts to:
- Improve accuracy for specific product types
- Add domain-specific instructions (e.g., specialized equipment)
- Fine-tune how multiple AI responses are combined
- Experiment with different prompt strategies

## Decision

Make AI prompts configurable through the Settings UI with database persistence.

### Implementation

#### Backend Changes

1. **Settings Storage** (`SettingController.php`):
   - Added `ai_prompt_smart_add` and `ai_prompt_synthesis` to readable/writable settings
   - Validation allows up to 10,000 characters per prompt

2. **Default Prompts** (`AnalyzeItemImageAction.php`):
   - Defined `DEFAULT_SMART_ADD_PROMPT` constant with the full analysis prompt
   - Defined `DEFAULT_SYNTHESIS_PROMPT` constant with the synthesis prompt
   - Added `getSynthesisPrompt()` static method for orchestrator access

3. **Dynamic Prompt Loading**:
   - `buildPrompt()` reads from settings with fallback to default
   - `AIAgentOrchestrator` uses `AnalyzeItemImageAction::getSynthesisPrompt()`

4. **Placeholder System**:
   - Smart Add: `{context}` (analysis context), `{categories}` (available categories)
   - Synthesis: `{original_prompt}` (the original prompt), `{responses}` (agent responses)

#### Frontend Changes

1. **API Types** (`api.ts`):
   - Added `ai_prompt_smart_add` and `ai_prompt_synthesis` to `AISettings` interface

2. **Settings Page** (`SettingsPage.tsx`):
   - Added default prompt constants (matching backend)
   - Collapsible "AI Prompts (Advanced)" section in AI Configuration
   - Two separate prompt editors, each with:
     - Large textarea showing current/default prompt
     - Individual "Reset to Default" button
     - Individual "Save" button
   - Placeholder documentation displayed to users

### Prompt Structure

**Smart Add Analysis Prompt** includes:
- Instructions for identifying brand/manufacturer from visual cues
- Common appliance brand list for reference
- Model number identification guidance
- Explicit rules against "Unknown" or placeholder values
- JSON output format specification

**Multi-Agent Synthesis Prompt** includes:
- Instructions for comparing responses from multiple AI agents
- Consensus finding logic
- Confidence score combination rules
- Same anti-placeholder rules
- JSON output format with `agents_agreed` field

## Consequences

### Positive

- **Flexibility**: Users can customize prompts for their specific use cases
- **Experimentation**: Easy to test different prompt strategies without code changes
- **Transparency**: Users can see exactly what instructions the AI receives
- **Per-Household**: Settings are scoped to each household
- **Safe Defaults**: Empty settings automatically use well-tested default prompts
- **Individual Control**: Each prompt can be saved/reset independently

### Negative

- **Complexity**: Users may break prompts with invalid modifications
- **Maintenance**: Default prompts need to stay in sync between frontend and backend
- **Learning Curve**: Users need to understand placeholder syntax

### Mitigations

- Default prompts are shown in the UI (not hidden as placeholders)
- Reset to Default button allows easy recovery
- Placeholder syntax is documented in the UI
- Prompts are only shown in an "Advanced" collapsible section

## Related Decisions

- [ADR 001: Multi-Agent AI Orchestration](001-multi-agent-ai-orchestration.md) - Foundation for AI agent system
- [ADR 003: Smart Add Photo Attachment](003-smart-add-photo-attachment.md) - Smart Add feature details

## Files Changed

### Backend
- `app/Http/Controllers/Api/SettingController.php` - Settings read/write
- `app/Actions/Items/AnalyzeItemImageAction.php` - Default prompts, dynamic loading
- `app/Services/AIAgentOrchestrator.php` - Uses settings-based synthesis prompt

### Frontend
- `src/services/api.ts` - AISettings type
- `src/pages/SettingsPage.tsx` - Prompt editor UI
