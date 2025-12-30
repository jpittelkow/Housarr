# ADR 010: AI Chatbot & Manual Extraction

## Status

Accepted

## Date

2024-12-30

## Context

Users needed a way to interact with their household item information more naturally and get intelligent assistance for troubleshooting, maintenance, and product questions. Additionally, users wanted to leverage the product manuals they upload by having the AI extract relevant information from PDFs.

Key requirements:
- Natural conversation interface for asking questions about household items
- Ability to extract and use information from uploaded PDF manuals
- Context-aware responses that consider item details, service history, and parts
- Support for multiple AI providers through the existing multi-agent system
- Suggested questions to help users discover useful queries

## Decision

We implemented a comprehensive AI chatbot system with two modes of operation:

### 1. General Chat Mode
- Endpoint: `POST /api/chat`
- Provides general home maintenance assistance without specific item context
- Uses a system prompt focused on home maintenance, troubleshooting, and safety

### 2. Item-Context Chat Mode
- Endpoint: `POST /api/chat/items/{item}`
- Builds rich context from:
  - Item details (make, model, serial number, warranty, maintenance schedule)
  - PDF manual content (extracted text up to 50KB)
  - Service/maintenance history (last 20 logs)
  - Registered parts list
- Allows users to toggle which context sources to include

### Architecture

```
ChatController
    ↓
ChatService (builds context, formats prompts)
    ↓
AIAgentOrchestrator (selects AI provider)
    ↓
AIService (makes API call to Claude/OpenAI/Gemini/Local)
```

### Key Features

1. **Manual Extraction**: Uses `PdfTextService` to extract text from uploaded PDFs, making manual content searchable and usable in AI responses.

2. **Conversation History**: Supports multi-turn conversations by accepting previous messages in the request.

3. **Suggested Questions**: Dynamically generates relevant questions based on:
   - Item category (HVAC, appliances, plumbing, electrical)
   - Presence of uploaded manuals
   - Service history
   - Warranty status

4. **Safety-Conscious Responses**: System prompt instructs AI to recommend professional help for dangerous repairs.

5. **Availability Check**: Endpoint to verify if AI is configured before showing chat UI.

### API Endpoints

```
POST /api/chat                          # General chat
POST /api/chat/items/{item}             # Item-specific chat
GET  /api/chat/items/{item}/suggestions # Get suggested questions
GET  /api/chat/availability             # Check if AI is available
```

## Consequences

### Positive

- Users can get intelligent, context-aware assistance for their household items
- Uploaded manuals become actionable through AI extraction
- Service history informs maintenance recommendations
- Multi-provider support ensures flexibility (users can use their preferred AI)
- Suggested questions improve discoverability

### Negative

- Manual extraction is limited to PDF format
- Large manual files may exceed context limits (capped at 50KB)
- AI responses may occasionally hallucinate specific part numbers or procedures
- Depends on external AI services being available

### Technical Debt

- Consider implementing streaming responses for better UX on long answers
- Manual extraction could be enhanced to support more file formats
- Could add caching of extracted manual text to improve response times

## Related Decisions

- [ADR 001: Multi-Agent AI Orchestration](001-multi-agent-ai-orchestration.md) - Foundation for AI provider management
- [ADR 008: Configurable AI Prompts](008-configurable-ai-prompts.md) - System prompt customization
