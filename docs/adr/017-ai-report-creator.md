# ADR 017: AI Report Creator

## Status

Accepted

## Date

2025-01-03

## Context

Users need a way to create custom reports from their household data. Traditional report builders require users to manually design layouts, select fields, and configure data sources. This is time-consuming and requires technical knowledge.

We wanted a solution that:
- Allows users to describe what they want in natural language
- Automatically generates reports matching the app's design system
- Provides always up-to-date data when viewing reports
- Is flexible enough to handle various report types (maintenance schedules, item lists, cost summaries, etc.)

## Decision

We implemented an AI-powered report creator that uses Claude to generate HTML/React reports based on user chat conversations.

### Architecture

1. **Chat Interface**: Users chat with Claude to describe the report they want
2. **Report Generation**: Claude generates standalone HTML files with embedded React components
3. **Hybrid Storage**: Report metadata stored in database, HTML files stored in filesystem
4. **Fresh Data**: Generated reports fetch data from dedicated API endpoints when viewed
5. **Design System Integration**: Generated reports use the app's Tailwind CSS design system

### Key Components

- **ReportService**: Handles report generation via Claude API
- **ReportController**: Manages report CRUD operations
- **ReportDataController**: Provides data endpoints for generated reports
- **Frontend Pages**: ReportsPage (list), ReportCreatorPage (chat), ReportViewerPage (display)

### Storage Strategy

- **Database**: Report metadata (id, name, description, household_id, prompt_used, file_path)
- **Filesystem**: Generated HTML stored in `storage/app/reports/{household_id}/{report_id}.html`

### Data Flow

```
User Chat → Claude API → HTML Generation → Save (DB + File) → View with Fresh API Data
```

## Consequences

### Positive

- **User-Friendly**: No technical knowledge required - users describe what they want
- **Flexible**: Can generate any type of report based on conversation
- **Always Fresh**: Reports fetch current data when viewed, not static snapshots
- **Design Consistency**: Generated reports match app's design system automatically
- **Scalable**: Each household's reports are isolated and stored efficiently

### Negative

- **AI Dependency**: Requires Claude API to be configured and available
- **Generation Time**: Report generation can take 30-120 seconds depending on complexity
- **Token Costs**: Each report generation consumes Claude API tokens
- **Code Validation**: Generated HTML/React code needs validation to ensure it's safe and functional
- **Limited Editing**: Currently, reports must be regenerated to change them (no visual editor)

## Related Decisions

- [ADR 001](001-multi-agent-ai-orchestration.md): Multi-Agent AI Orchestration - Uses the same AI infrastructure
- [ADR 010](010-ai-chatbot-manual-extraction.md): AI Chatbot & Manual Extraction - Similar chat-based interaction pattern

## Implementation Notes

- Reports are household-scoped for security and isolation
- Generated reports use CDN-loaded React and Tailwind CSS for portability
- Data endpoints are household-scoped to ensure users only see their own data
- Report files are stored using StorageService to support both local and S3 storage
- The system prompt includes detailed design system information to ensure consistency
