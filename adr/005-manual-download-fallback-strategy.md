# ADR 005: Manual Download Fallback Strategy

## Status

Accepted

## Date

2024-12-30

## Context

The Smart Fill feature includes automatic product manual searching and downloading. The original implementation relied on:

1. **DuckDuckGo HTML Search**: Scraping search results for PDF links
2. **ManualsLib**: Parsing search results and downloading PDFs
3. **Direct PDF Downloads**: Fetching PDFs from discovered URLs

### Problem Discovered

During testing, we found that **automated manual downloads consistently fail** due to:

1. **DuckDuckGo Bot Detection**: DuckDuckGo now shows a CAPTCHA ("Select all squares containing a duck") instead of search results for automated requests
2. **ManualsLib Protection**: ManualsLib requires viewing multiple pages before allowing downloads, and serves HTML instead of PDF for direct download attempts
3. **Manufacturer Site Complexity**: Many manufacturer sites require JavaScript execution or login

Example log output:
```
DuckDuckGo query results {"urls_found":0}
Downloaded file is not a PDF {"content_type":"text/html; charset=UTF-8"}
```

## Decision

We implemented a **graceful fallback strategy** that:

1. **Attempts direct download first** from repositories and AI-suggested URLs
2. **Detects bot blocking** by checking response content
3. **Falls back to search links** when direct download fails
4. **Provides user-actionable links** to find manuals manually

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Manual Search Flow                        │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Search repositories (ManualsLib URLs, manufacturer)     │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  2. AI-suggested URLs (improved prompt with brand hints)    │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Web search (DuckDuckGo - may return search page URLs)   │
│     - Detects bot blocking (anomaly-modal, captcha)         │
│     - Returns Google search URLs as fallback                │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Try downloading from direct URLs                        │
│     - Verify PDF content (check %PDF magic bytes)           │
│     - Skip HTML responses                                   │
└─────────────────────────────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
         Success               All Failed
              │                     │
              ▼                     ▼
    ┌─────────────────┐   ┌─────────────────────────┐
    │ Save PDF to     │   │ Show search links for   │
    │ item's files    │   │ user to find manually   │
    └─────────────────┘   └─────────────────────────┘
```

### User Interface

When automatic download fails, the UI shows:
- Status message: "Auto-download failed - try these search links"
- Clickable buttons linking to Google/Bing searches pre-filled with make/model
- External link icon indicating opens in new tab

## Consequences

### Positive

- **Always provides value**: Even when download fails, users get helpful search links
- **Graceful degradation**: Feature remains useful despite bot detection
- **User empowerment**: Links let users find manuals from sources we can't access
- **Reduced errors**: No more confusing "download failed" without alternatives

### Negative

- **Not fully automated**: Users must complete final download step manually
- **Search accuracy varies**: Google results may not always surface the right manual
- **Extra user effort**: Requires clicking through to external sites

### Future Improvements

- Add support for paid search APIs (Google Custom Search, SerpAPI) for reliable results
- Implement browser extension for manual download assistance
- Partner with manual repository APIs where available
- Add community-contributed manual links

## Related Decisions

- ADR 001: Multi-Agent AI Orchestration (AI URL suggestions)
- ADR 002: Part Image Search Strategy (similar scraping challenges)
