# Architecture Decision Records (ADR)

This directory contains Architecture Decision Records for the Housarr project.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences.

## ADR Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| [001](001-multi-agent-ai-orchestration.md) | Multi-Agent AI Orchestration | Accepted | 2024-12-30 |
| [002](002-part-image-search-strategy.md) | Part Image Search Strategy | Accepted | 2024-12-30 |
| [003](003-smart-add-photo-attachment.md) | Smart Add Photo Attachment Logic | Accepted | 2024-12-30 |
| [004](004-development-guidelines-core-functionality.md) | Development Guidelines for Core Functionality | Accepted | 2024-12-29 |
| [005](005-manual-download-fallback-strategy.md) | Manual Download Fallback Strategy | Accepted | 2024-12-30 |
| [006](006-document-management-enhancements.md) | Document Management Enhancements | Accepted | 2024-12-30 |
| [007](007-part-image-management.md) | Part Image Management | Accepted | 2024-12-30 |
| [008](008-configurable-ai-prompts.md) | Configurable AI Prompts | Accepted | 2024-12-30 |
| [009](009-zip-backup-with-files.md) | ZIP Backup with Files | Accepted | 2024-12-30 |
| [010](010-ai-chatbot-manual-extraction.md) | AI Chatbot & Manual Extraction | Accepted | 2024-12-30 |
| [011](011-comprehensive-testing-strategy.md) | Comprehensive Testing Strategy | Accepted | 2024-12-30 |
| [012](012-docker-self-hosted-deployment.md) | Docker Self-Hosted Deployment Strategy | Accepted | 2024-12-31 |
| [013](013-vendor-search-address-features.md) | Vendor Search & Address Features | Accepted | 2024-12-31 |
| [014](014-smart-add-product-image-search.md) | Smart Add Product Image Search | Accepted | 2024-12-30 |
| [015](015-separate-item-vendor-categories.md) | Separate Item and Vendor Categories | Accepted | 2025-01-02 |
| [016](016-room-detail-page-and-image-upload.md) | Room Detail Page and Image Upload Improvements | Accepted | 2025-01-01 |
| [017](017-ai-report-creator.md) | AI Report Creator | Accepted | 2025-01-03 |

## ADR Template

When creating a new ADR, use the following template:

```markdown
# ADR [NUMBER]: [TITLE]

## Status

[Proposed | Accepted | Deprecated | Superseded]

## Date

[YYYY-MM-DD]

## Context

[Describe the context and problem statement]

## Decision

[Describe the decision and rationale]

## Consequences

### Positive
- [List positive consequences]

### Negative
- [List negative consequences]

## Related Decisions

- [Links to related ADRs]
```

## Naming Convention

ADR files are named using the pattern: `NNN-short-title.md`

- `NNN`: Three-digit sequential number (001, 002, etc.)
- `short-title`: Lowercase, hyphen-separated description

## Status Definitions

- **Proposed**: Under discussion, not yet accepted
- **Accepted**: Decision has been made and is in effect
- **Deprecated**: No longer relevant but kept for historical reference
- **Superseded**: Replaced by a newer decision (link to new ADR)
