<?php

namespace App\Actions\Rooms;

use App\Models\Setting;
use App\Services\AIAgentOrchestrator;
use Illuminate\Http\UploadedFile;

class AnalyzeRoomColorAction
{
    /**
     * Default prompt template for wall color analysis.
     */
    public const DEFAULT_WALL_COLOR_PROMPT = <<<'PROMPT'
{context}

IMPORTANT INSTRUCTIONS:
Analyze this room photo to identify the dominant wall colors. Your goal is to match the wall colors to real paint brands and provide purchase information.

1. **Color Identification**:
   - Identify the dominant wall color(s) visible in the image
   - If multiple walls have different colors, identify each major color
   - Focus on wall surfaces, not furniture or decorations

2. **Paint Brand Matching**:
   - Match the identified colors to paint from top brands: Sherwin-Williams, Benjamin Moore, Behr, Valspar, PPG, Glidden, Olympic, Dutch Boy
   - Use your knowledge of common paint colors and brand naming conventions
   - If you cannot find an exact match, provide the closest match you can identify

3. **Color Values**:
   - Provide hex code (format: #RRGGBB, e.g., #FF5733)
   - Provide RGB values (R: 0-255, G: 0-255, B: 0-255)
   - These should match the actual color you see in the image

4. **Purchase URLs**:
   - Generate generic search URLs for each brand (e.g., brand website search page)
   - Attempt to find specific product page URLs when possible
   - Format: Use brand's typical search URL pattern with color name encoded

5. **Output Format**:
   - Return up to 5 color matches per identified wall color
   - Rank by confidence/match quality
   - For each color, include: brand, color_name, hex_code, rgb (r, g, b), purchase_url, product_url (if found)

You MUST return ONLY a valid JSON array with no additional text, markdown, or explanation.

Format:
[
  {
    "brand": "Sherwin-Williams",
    "color_name": "Agreeable Gray",
    "hex_code": "#D0CCC9",
    "rgb_r": 208,
    "rgb_g": 204,
    "rgb_b": 201,
    "purchase_url": "https://www.sherwin-williams.com/homeowners/color/find-and-explore-colors/paint-colors-by-family/SW7029-agreeable-gray",
    "product_url": null,
    "confidence": 0.95
  },
  {
    "brand": "Benjamin Moore",
    "color_name": "Classic Gray",
    "hex_code": "#D3CCC4",
    "rgb_r": 211,
    "rgb_g": 204,
    "rgb_b": 196,
    "purchase_url": "https://www.benjaminmoore.com/en-us/color-overview/find-your-color/color/oc-23/classic-gray",
    "product_url": null,
    "confidence": 0.85
  }
]

If you cannot identify any wall colors, return an empty array: []
PROMPT;

    /**
     * Execute the wall color analysis using multiple AI agents.
     *
     * @param UploadedFile $file Image file to analyze
     * @param int|null $householdId Household ID for AI settings
     * @return array Results with paint color suggestions
     */
    public function execute(UploadedFile $file, ?int $householdId = null): array
    {
        $orchestrator = AIAgentOrchestrator::forHousehold($householdId);

        if (!$orchestrator->isAvailable()) {
            throw new \Exception('AI is not configured. Please configure an AI provider in Settings.');
        }

        $base64Image = base64_encode(file_get_contents($file->getRealPath()));
        $mimeType = $file->getMimeType();

        $prompt = $this->buildPrompt($householdId);

        // Use multi-agent analysis with synthesis
        $response = $orchestrator->analyzeImageWithAllAgentsAndSynthesize(
            $base64Image,
            $mimeType,
            $prompt,
            ['max_tokens' => 2048, 'timeout' => 90]
        );

        // Extract and parse paint color results
        return $this->processResponse($response, $orchestrator);
    }

    /**
     * Build the analysis prompt.
     */
    protected function buildPrompt(?int $householdId = null): string
    {
        $context = "Analyze this room photo to identify the dominant wall colors. Match them to paint brands and provide color codes and purchase links.";

        // Get custom prompt from settings or use default
        $promptTemplate = Setting::get('ai_prompt_wall_color', $householdId, self::DEFAULT_WALL_COLOR_PROMPT);

        // Replace placeholders in the template
        return str_replace(
            ['{context}'],
            [$context],
            $promptTemplate
        );
    }

    /**
     * Process the orchestrator response into paint color suggestions.
     */
    protected function processResponse(array $response, AIAgentOrchestrator $orchestrator): array
    {
        $agentsUsed = [];
        $agentDetails = [];
        $agentsSucceeded = 0;
        $agentErrors = [];

        // Collect agent metadata
        if (!empty($response['agents'])) {
            foreach ($response['agents'] as $agentName => $agentResult) {
                $agentsUsed[] = $agentName;
                $success = $agentResult['success'] ?? false;
                $agentDetails[$agentName] = [
                    'success' => $success,
                    'duration_ms' => $agentResult['duration_ms'] ?? 0,
                    'error' => $agentResult['error'] ?? null,
                ];
                if ($success) {
                    $agentsSucceeded++;
                }
                if (!empty($agentResult['error'])) {
                    $agentErrors[$agentName] = $agentResult['error'];
                }
            }
        }

        // Get synthesized results (preferred) or summary
        $synthesizedText = $response['synthesized'] ?? $response['summary'] ?? null;
        $paintColors = [];

        if ($synthesizedText) {
            $paintColors = $this->parsePaintColors($synthesizedText);
        }

        // If synthesis failed, try to parse from individual agent responses
        if (empty($paintColors) && !empty($response['agents'])) {
            foreach ($response['agents'] as $agentResult) {
                if (!empty($agentResult['response'])) {
                    $parsed = $this->parsePaintColors($agentResult['response']);
                    if (!empty($parsed)) {
                        $paintColors = array_merge($paintColors, $parsed);
                        break; // Use first successful parse
                    }
                }
            }
        }

        return [
            'paint_colors' => $paintColors,
            'agents_used' => $agentsUsed,
            'agents_succeeded' => $agentsSucceeded,
            'agent_details' => $agentDetails,
            'agent_errors' => $agentErrors,
            'primary_agent' => $orchestrator->getPrimaryAgent(),
            'synthesis_agent' => $response['synthesis_agent'] ?? $response['summary_agent'] ?? null,
            'total_duration_ms' => $response['total_duration_ms'] ?? 0,
        ];
    }

    /**
     * Parse paint color results from AI response text.
     */
    protected function parsePaintColors(string $text): array
    {
        // Try to extract JSON array from the text
        // Look for JSON array pattern
        $jsonPattern = '/\[\s*\{.*\}\s*\]/s';
        if (preg_match($jsonPattern, $text, $matches)) {
            try {
                $parsed = json_decode($matches[0], true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($parsed)) {
                    return $this->normalizePaintColors($parsed);
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Failed to parse paint colors JSON', [
                    'error' => $e->getMessage(),
                    'text_preview' => substr($text, 0, 500),
                ]);
            }
        }

        // Fallback: try to decode entire text as JSON
        try {
            $parsed = json_decode($text, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($parsed)) {
                return $this->normalizePaintColors($parsed);
            }
        } catch (\Exception $e) {
            // Ignore
        }

        return [];
    }

    /**
     * Normalize and validate paint color data.
     */
    protected function normalizePaintColors(array $colors): array
    {
        $normalized = [];

        foreach ($colors as $color) {
            if (!is_array($color)) {
                continue;
            }

            // Validate required fields
            if (empty($color['color_name'])) {
                continue;
            }

            // Normalize hex code (ensure it starts with #)
            $hexCode = $color['hex_code'] ?? null;
            if ($hexCode && !str_starts_with($hexCode, '#')) {
                $hexCode = '#' . $hexCode;
            }

            // Validate RGB values
            $rgbR = isset($color['rgb_r']) ? (int) $color['rgb_r'] : null;
            $rgbG = isset($color['rgb_g']) ? (int) $color['rgb_g'] : null;
            $rgbB = isset($color['rgb_b']) ? (int) $color['rgb_b'] : null;

            if ($rgbR !== null && ($rgbR < 0 || $rgbR > 255)) {
                $rgbR = null;
            }
            if ($rgbG !== null && ($rgbG < 0 || $rgbG > 255)) {
                $rgbG = null;
            }
            if ($rgbB !== null && ($rgbB < 0 || $rgbB > 255)) {
                $rgbB = null;
            }

            $normalized[] = [
                'brand' => $color['brand'] ?? null,
                'color_name' => $color['color_name'],
                'hex_code' => $hexCode,
                'rgb_r' => $rgbR,
                'rgb_g' => $rgbG,
                'rgb_b' => $rgbB,
                'purchase_url' => $color['purchase_url'] ?? null,
                'product_url' => $color['product_url'] ?? null,
                'confidence' => isset($color['confidence']) ? (float) $color['confidence'] : 0.5,
            ];
        }

        return $normalized;
    }
}
