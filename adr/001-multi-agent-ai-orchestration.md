# ADR 001: Multi-Agent AI Orchestration for Smart Features

## Status

Accepted

## Date

2024-12-30

## Context

Housarr uses AI to power several smart features:
- **Smart Add**: Identify products from images or text queries
- **Smart Fill**: Get maintenance suggestions, warranty info, and parts recommendations for items

Originally, these features used a single AI provider configured in settings (`AIService`). This had limitations:
1. Single point of failure if the configured provider was unavailable
2. No way to leverage multiple AI providers for better accuracy
3. Users with multiple API keys couldn't benefit from consensus across models

## Decision

We implemented a **Multi-Agent AI Orchestration** pattern using the `AIAgentOrchestrator` class:

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Request                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AIAgentOrchestrator                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              callActiveAgentsWithSummary()           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
     ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
     │ Claude │    │ OpenAI │    │ Gemini │    │ Local  │
     └────────┘    └────────┘    └────────┘    └────────┘
          │              │              │              │
          └──────────────┴──────────────┴──────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Primary Agent Synthesis                   │
│         (Combines responses into single best answer)         │
└─────────────────────────────────────────────────────────────┘
```

### Key Decisions

1. **Parallel Execution**: All active agents are called simultaneously to minimize latency
2. **Primary Agent Synthesis**: The designated primary agent synthesizes results from all agents
3. **Fallback Parsing**: If synthesis fails, individual agent responses are parsed directly
4. **Agent Metadata**: Full transparency on which agents participated, succeeded, and timing

### Affected Features

| Feature | Endpoint | Method |
|---------|----------|--------|
| Smart Add | `POST /items/analyze-image` | `analyzeImageWithAllAgentsAndSynthesize()` |
| AI Suggestions | `POST /items/{item}/ai-query` | `callActiveAgentsWithSummary()` |
| Parts Suggestions | `POST /items/{item}/suggest-parts` | `callActiveAgentsWithSummary()` |

### Response Structure

All multi-agent endpoints return consistent metadata:

```json
{
  "success": true,
  "results": [...],
  "agents_used": ["claude", "openai"],
  "agents_succeeded": 2,
  "agent_details": {
    "claude": { "success": true, "duration_ms": 2340 },
    "openai": { "success": true, "duration_ms": 1890 }
  },
  "synthesis_agent": "claude",
  "total_duration_ms": 2450
}
```

## Consequences

### Positive

- **Higher Accuracy**: Multiple AI perspectives improve result quality
- **Fault Tolerance**: Feature works even if some providers fail
- **Transparency**: Users see which agents contributed to results
- **Consensus Visibility**: UI shows agreement level between agents
- **Future-Proof**: Easy to add new AI providers

### Negative

- **Increased Latency**: Must wait for slowest agent (mitigated by parallel calls)
- **Higher API Costs**: Multiple providers called per request
- **Complexity**: More code to maintain in orchestrator
- **Token Usage**: Synthesis step uses additional tokens

### Mitigations

- Timeout handling prevents slow agents from blocking forever
- Agent-specific error tracking helps identify problematic providers
- Fallback to single-agent parsing if synthesis fails

## Related Decisions

- ADR 002: Part Image Search Strategy
- ADR 003: Smart Add Photo Attachment Logic
