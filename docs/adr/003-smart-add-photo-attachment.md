# ADR 003: Smart Add Photo Attachment Logic

## Status

Accepted

## Date

2024-12-30

## Context

Smart Add allows users to identify products in two ways:
1. **Photo Search**: Upload an image of the product
2. **Text Search**: Enter make/model or product description

When creating an item from search results, we needed to decide how to handle the item's primary photo.

### Scenarios

| Search Type | Result Has Image URL | Expected Behavior |
|-------------|---------------------|-------------------|
| Photo uploaded | N/A | Use uploaded photo |
| Text search | Yes | Download and use product image |
| Text search | No | No photo attached |

## Decision

We implemented **context-aware photo attachment** based on how the search was initiated.

### State Tracking

```typescript
// Track whether search was initiated with a photo
const [wasPhotoSearch, setWasPhotoSearch] = useState(false)

// Track selected result's product image URL
const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
```

### Photo Selection Logic

```
┌────────────────────────────────────────────────────────────┐
│                  User Creates Item                          │
└────────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  Was photo search?  │
              └─────────────────────┘
                    │         │
                   Yes        No
                    │         │
                    ▼         ▼
         ┌──────────────┐  ┌─────────────────────────┐
         │ Upload the   │  │ Does selected result    │
         │ user's photo │  │ have an image URL?      │
         └──────────────┘  └─────────────────────────┘
                                   │         │
                                  Yes        No
                                   │         │
                                   ▼         ▼
                          ┌──────────────┐  ┌────────────┐
                          │ Download and │  │ No photo   │
                          │ attach image │  │ attached   │
                          └──────────────┘  └────────────┘
```

### Implementation

```typescript
// On item creation success
if (wasPhotoSearch && uploadedImage) {
  // User uploaded a photo - use their photo
  await files.upload(uploadedImage, 'item', newItemId, true)
} else if (selectedImageUrl) {
  // Text search with product image - download it
  await files.uploadFromUrl(selectedImageUrl, 'item', newItemId, true)
}
```

### Backend Support

Added new endpoint for downloading images from URLs:

```
POST /api/files/from-url
{
  "url": "https://example.com/product.jpg",
  "fileable_type": "item",
  "fileable_id": 123,
  "is_featured": true
}
```

## Consequences

### Positive

- **User Intent Respected**: Photo searches use user's photo (they may have captured specific details)
- **Automatic Enrichment**: Text searches get product images when available
- **No Duplicate Photos**: Won't download product image if user already provided one
- **Featured Flag**: Downloaded images are marked as featured automatically

### Negative

- **External Image Dependency**: Downloaded URLs may become invalid over time
- **Storage Usage**: Downloading images increases storage requirements
- **Copyright Concerns**: Product images may have usage restrictions

### Edge Cases Handled

1. **Photo search but no photo selected**: Uses uploaded photo
2. **Text search with no results**: No photo attached
3. **Image download fails**: Item still created, just without photo
4. **User unchecks "Attach photo"**: Neither photo nor download occurs

## UI Indication

The checkbox label changes based on context:

| Context | Checkbox Label |
|---------|---------------|
| Photo search | "Attach uploaded photo" |
| Text search with image | "Attach product photo" |
| Text search without image | "Attach photo" (disabled) |

## Update: Mobile Camera Capture (2024-12-31)

### Context

Users on mobile devices needed a more direct way to capture photos of products using their phone's camera, rather than first taking a photo and then selecting it from the gallery.

### Decision

Added native camera capture support using the HTML5 `capture` attribute on file inputs:

- **Smart Add Page**: Added a dedicated "Take Photo" button that opens the rear camera directly
- **ImageUpload Component**: Added camera button for all image upload areas
- **Avatar Upload**: Uses front camera (`capture="user"`) for selfies
- **Object Photos**: Uses rear camera (`capture="environment"`) for items/products

### Implementation

```html
<!-- Rear camera for object photos -->
<input type="file" accept="image/*" capture="environment" />

<!-- Front camera for selfies/avatars -->
<input type="file" accept="image/*" capture="user" />
```

Mobile detection determines when to show camera buttons:

```typescript
function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) 
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024)
}
```

### UX Flow

On mobile devices, users see two options:
1. **Gallery button** - Select existing photos from device
2. **Camera button** - Open camera to take new photo immediately

On desktop, only the standard file picker is shown.

## Related Decisions

- ADR 001: Multi-Agent AI Orchestration
- ADR 002: Part Image Search Strategy
- ADR 014: Smart Add Product Image Search

## Recent Enhancements (2024-12-31)

**Image Gallery Import**: Product images from search results are now automatically imported to the item's image gallery when creating an item, providing visual reference even if not set as featured.

**Try Again Button**: Users can now request new AI suggestions when none of the initial results match, with the AI receiving feedback that previous results were incorrect.

## User Context Input (2025-01-02)

### Context

Users often have additional information about products that could help AI identify them more accurately, such as:
- Location of the product (e.g., "kitchen refrigerator")
- Visible features or details not captured in the photo
- Hints about where model numbers might be located
- Brand or model information partially visible

Previously, users could only provide text context through the search query field, which was primarily designed for text-only searches. Photo uploads immediately triggered analysis without an opportunity to add context.

### Decision

We implemented a **two-stage context input system**:

1. **Photo Confirmation Step**: When a user uploads or takes a photo, they see a confirmation screen with:
   - Photo preview
   - Optional context input field
   - "Search" and "Cancel" buttons
   - Analysis only starts after user confirms

2. **Results Page Context Editing**: On the results page, above the "Try Again" button:
   - Context input field showing the original prompt (if any)
   - Editable field allowing users to refine their search context
   - "Try Again" button uses the updated context

### Implementation

**State Management:**
```typescript
const [userPrompt, setUserPrompt] = useState('') // User-provided context
const [showPhotoConfirmation, setShowPhotoConfirmation] = useState(false)
```

**Photo Upload Flow:**
```
User uploads photo → Photo preview + context input shown → 
User enters context (optional) → Clicks "Search" → Analysis starts
```

**Results Page:**
- Context input appears above "Try Again" button
- Shows original `userPrompt` (for photo searches) or `searchQuery` (for text searches)
- User can edit before clicking "Try Again"
- Updated context is sent to AI with feedback message

**Key Design Decisions:**
- Context input is **optional** - analysis works without it
- Separate `userPrompt` state from `searchQuery` to distinguish photo vs text searches
- Photo confirmation step prevents accidental immediate analysis
- Results page editing allows refinement without starting over

### UX Flow

**Photo Search Path:**
1. User uploads/takes photo
2. Confirmation screen appears with photo preview and context input
3. User optionally adds context (e.g., "This is in my kitchen, model number on back")
4. User clicks "Search"
5. Analysis starts with photo + context
6. Results page shows context input above "Try Again" button
7. User can edit context and click "Try Again" for refined search

**Text Search Path:**
1. User enters text in search field
2. User clicks "Search"
3. Analysis starts immediately (no confirmation step)
4. Results page shows context input with original search query
5. User can edit and retry

### Consequences

**Positive:**
- **Better AI Accuracy**: Additional context helps AI identify products more accurately
- **User Control**: Users can refine searches without starting over
- **Flexible Input**: Context is optional, doesn't block users who want quick searches
- **Clear Intent**: Confirmation step prevents accidental photo analysis

**Negative:**
- **Additional Step**: Photo uploads require one extra click (confirmation)
- **State Complexity**: Need to manage separate `userPrompt` and `searchQuery` states
- **UI Space**: Results page has additional input field

**Edge Cases Handled:**
- Empty context input still triggers analysis
- Context input preserves value when retrying
- Reset clears both `userPrompt` and `searchQuery`
- Text searches don't show photo confirmation step

## Photo Confirmation Modal (2025-01-02)

### Context

On mobile devices, the photo confirmation step (showing photo preview + context input) was displayed inline on the page. This could cause layout issues and wasn't optimal for small screens where overlaying content provides a better UX.

### Decision

Moved the photo confirmation UI into a **Modal** component for better mobile experience:

- Photo preview and context input now appear in a centered modal overlay
- Modal ensures the confirmation step is always visible on top of other content
- Consistent with mobile UI patterns (bottom sheets, dialogs)
- Cancel and Search buttons in modal footer

### Implementation

```tsx
<Modal
  isOpen={showPhotoConfirmation}
  onClose={() => setShowPhotoConfirmation(false)}
  title="Confirm Photo"
>
  {/* Photo preview */}
  <img src={previewUrl} alt="Preview" />
  
  {/* Context input */}
  <Input
    label="Add context (optional)"
    value={userPrompt}
    onChange={(e) => setUserPrompt(e.target.value)}
    placeholder="e.g., Model number on back, kitchen appliance..."
  />
  
  <ModalFooter>
    <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
    <Button onClick={handleConfirmPhotoSearch}>Search</Button>
  </ModalFooter>
</Modal>
```

## Live AI Agent Progress (2025-01-02)

### Context

When Smart Add analyzes a photo, it uses multiple AI agents in parallel (Claude, OpenAI, Gemini, Local). Previously, users only saw a generic loading spinner with no indication of progress, making it unclear whether the search was working or how long to wait.

### Decision

Implemented **Server-Sent Events (SSE)** streaming to provide real-time progress updates during analysis:

1. **Backend SSE Endpoint**: New `/api/items/analyze-image-stream` endpoint streams progress events
2. **Per-Agent Progress**: Shows each AI agent's status (pending, running, complete, error)
3. **Overall Progress Bar**: Visual indicator of how many agents have completed
4. **Duration Display**: Shows how long each agent took to respond
5. **Graceful Fallback**: If SSE fails, automatically falls back to non-streaming endpoint

### Implementation

**Backend (ItemController.php):**
```php
public function analyzeImageStream(Request $request): StreamedResponse
{
    return response()->stream(function () {
        // Send init event with agent list
        $this->sendSSE('init', ['agents' => $activeAgents, 'total' => count($activeAgents)]);
        
        // Progress callback for each agent
        $onAgentComplete = function ($agent, $result, $completed, $total) {
            $this->sendSSE('agent_complete', [
                'agent' => $agent,
                'success' => $result['success'],
                'duration_ms' => $result['duration_ms'],
                'completed' => $completed,
                'total' => $total,
            ]);
        };
        
        // Call AI agents with progress callback
        $response = $orchestrator->analyzeImageWithAllAgentsStreaming(..., $onAgentComplete);
        
        // Send synthesis and complete events
        $this->sendSSE('synthesis_start', []);
        $this->sendSSE('complete', ['results' => $results]);
    }, 200, $this->getSSEHeaders());
}
```

**Frontend (SmartAddPage.tsx):**
```tsx
// State for progress tracking
const [agentProgress, setAgentProgress] = useState<AgentProgress[]>([])
const [overallProgress, setOverallProgress] = useState({ completed: 0, total: 0 })
const [isSynthesizing, setIsSynthesizing] = useState(false)

// SSE streaming with fetch API
const response = await fetch('/api/items/analyze-image-stream', {
  method: 'POST',
  body: formData,
  credentials: 'include',
})

const reader = response.body?.getReader()
// Parse SSE events and update state...
```

**Progress UI:**
```
┌─────────────────────────────────────────┐
│ Analyzing... (2/4 agents complete)       │
│ [████████████░░░░░░░░░░░░] 50%          │
│                                          │
│ ✓ Claude         (1.2s)                 │
│ ✓ OpenAI         (0.8s)                 │
│ ◌ Gemini         running...             │
│ ◌ Local          pending                │
│                                          │
│ Synthesizing results...                  │
└─────────────────────────────────────────┘
```

### Infrastructure Configuration

SSE requires specific nginx and PHP configuration to work properly:

**nginx.conf:**
```nginx
location = /api/items/analyze-image-stream {
    # Disable buffering for real-time streaming
    fastcgi_buffering off;
    fastcgi_request_buffering off;
    gzip off;
    fastcgi_read_timeout 300s;
    chunked_transfer_encoding on;
}
```

**php.ini:**
```ini
output_buffering = Off
implicit_flush = On
zlib.output_compression = Off
```

**CSRF Exception (bootstrap/app.php):**
```php
$middleware->validateCsrfTokens(except: [
    'api/items/analyze-image-stream',
]);
```

### Consequences

**Positive:**
- Users see real-time progress during AI analysis
- Clear indication that the system is working
- Per-agent timing helps identify slow providers
- Graceful degradation if SSE unavailable

**Negative:**
- Additional infrastructure complexity (nginx/PHP config)
- CSRF exception required for streaming endpoint
- More state management in frontend