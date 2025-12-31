<?php

namespace App\Actions\Items;

use App\Models\Setting;
use App\Services\AIAgentOrchestrator;
use App\Services\ProductImageSearchService;
use Illuminate\Http\UploadedFile;

class AnalyzeItemImageAction
{
    /**
     * Default prompt template for Smart Add analysis.
     */
    public const DEFAULT_SMART_ADD_PROMPT = <<<'PROMPT'
{context}

IMPORTANT INSTRUCTIONS:
1. Make/Manufacturer - Identify the BRAND NAME visible on the product or recognize it by distinctive design features. 
   - Look for logos, nameplates, badges, or text on the product
   - If the brand is partially visible, use your best judgment
   - Common appliance brands: GE, Samsung, LG, Whirlpool, Frigidaire, Bosch, KitchenAid, Maytag, Thermador, Viking, Wolf, Sub-Zero, Miele, Signature Kitchen Suite, etc.
   - NEVER use "Unknown" or "N/A" - make your best educated guess based on the design

2. Model number - CRITICAL: Extract the EXACT model number from labels, stickers, or nameplates on the product.
   
   WHERE TO LOOK: Check the back panel, inside door frames, bottom edge, side panels, and any visible labels/stickers.
   
   WHAT TO EXTRACT:
   - Look for alphanumeric codes like "24ACC636A003", "WF45R6100AW", "GDF570PSMSS"
   - Model numbers are typically 6-20 characters (letters and numbers, may include dashes/slashes)
   - Extract EXACTLY as shown (case-sensitive)
   - May be labeled as "Model:", "Model No.:", "MODEL", or just the code
   
   RULES:
   - If you see a model number anywhere in the image, extract it EXACTLY - do NOT use a description
   - If NO model number is visible after checking all locations, you may use a brief descriptive text (e.g., "French door 36-inch")
   - NEVER make up or invent a model number
   - NEVER use generic descriptions like "48-inch refrigerator" if a model number is visible

3. Product type/category

{categories}

Return up to 10 possible matches ranked by confidence.
You MUST return ONLY a valid JSON array with no additional text, markdown, or explanation.

RULES:
- Do NOT use "Unknown", "N/A", "Not visible", or similar placeholder text
- Make your BEST educated guess for the brand based on design style, features, and appearance
- If you're 50% sure it's a Thermador but could be Viking, include BOTH as separate results with different confidence scores
- Model number: ALWAYS prioritize extracting the exact model number from labels/stickers. Only use descriptive text if NO model number is visible anywhere in the image after thorough search. NEVER make up or invent model numbers.

Format:
[
  { "make": "Brand Name", "model": "Model Number or Description", "type": "Category Name", "confidence": 0.95 },
  { "make": "Alternative Brand", "model": "Model", "type": "Category Name", "confidence": 0.70 }
]

If you truly cannot identify ANY aspect of the product, return an empty array: []
PROMPT;

    /**
     * Default prompt template for multi-agent synthesis.
     */
    public const DEFAULT_SYNTHESIS_PROMPT = <<<'PROMPT'
You are synthesizing product identification responses from multiple AI assistants.
Each assistant was asked to identify products from the same image or search query.

Your task:
1. Compare all responses and find consensus on make, model, and product type
2. If agents disagree, use your knowledge to determine the most likely correct answer
3. Combine confidence scores - if multiple agents agree, confidence should be higher
4. Return a single consolidated JSON array of the best product matches

IMPORTANT RULES:
- Do NOT use "Unknown", "N/A", "Not visible", or any placeholder text
- Always provide your best guess for the brand/make based on design characteristics
- MODEL NUMBER PRIORITY: When synthesizing results, ALWAYS prefer actual model numbers over descriptions
  - If one agent found a model number (e.g., "24ACC636A003") and another used a description (e.g., "48-inch refrigerator"), use the model number
  - If multiple agents found model numbers, use the one with highest confidence or consensus
  - NEVER synthesize a made-up model number from descriptions
  - Only use descriptive text if NO agent found a model number
- Filter out any "Unknown" results from the source responses

Original analysis prompt: {original_prompt}

Responses from different AI assistants:
{responses}

Return ONLY a valid JSON array with the synthesized best matches, ranked by confidence.
Format:
[
  { "make": "Brand", "model": "Model", "type": "Category", "confidence": 0.95, "agents_agreed": 3 },
  { "make": "Brand", "model": "Alt Model", "type": "Category", "confidence": 0.70, "agents_agreed": 2 }
]
PROMPT;

    /**
     * Execute the product analysis using multiple AI agents.
     *
     * @param UploadedFile|null $file Image file to analyze
     * @param array|null $categories Available category names for context
     * @param int|null $householdId Household ID for AI settings
     * @param string|null $query Text query for product search
     * @return array Results with agent metadata
     */
    public function execute(?UploadedFile $file, ?array $categories = [], ?int $householdId = null, ?string $query = null): array
    {
        $orchestrator = AIAgentOrchestrator::forHousehold($householdId);

        if (!$orchestrator->isAvailable()) {
            throw new \Exception('AI is not configured. Please configure an AI provider in Settings.');
        }

        $base64Image = null;
        $mimeType = null;

        if ($file) {
            $base64Image = base64_encode(file_get_contents($file->getRealPath()));
            $mimeType = $file->getMimeType();
        }

        $prompt = $this->buildPrompt($file, $query, $categories, $householdId);

        // Use multi-agent analysis with synthesis
        if ($base64Image) {
            $response = $orchestrator->analyzeImageWithAllAgentsAndSynthesize(
                $base64Image,
                $mimeType,
                $prompt,
                ['max_tokens' => 2048, 'timeout' => 90]
            );
        } else {
            $response = $orchestrator->callActiveAgentsWithSummary(
                $prompt,
                ['max_tokens' => 2048, 'timeout' => 60]
            );
        }

        // Extract results from the orchestrator response
        return $this->processOrchestratorResponse($response, $orchestrator);
    }

    /**
     * Build the analysis prompt.
     */
    protected function buildPrompt(?UploadedFile $file, ?string $query, ?array $categories, ?int $householdId = null): string
    {
        $categoryList = !empty($categories)
            ? "Available categories: " . implode(', ', $categories) . "\nChoose from these categories when possible, or suggest a new one if none fit."
            : "Suggest an appropriate category for this product.";

        $context = "";
        if ($file && $query) {
            $context = "Analyze this image and use the provided search text '$query' to help identify the product.";
        } elseif ($file) {
            $context = "Analyze this image of a home appliance, equipment, or product.";
        } else {
            $context = "Identify the product based on the following search text: '$query'.";
        }

        // Get custom prompt from settings or use default
        $promptTemplate = Setting::get('ai_prompt_smart_add', $householdId, self::DEFAULT_SMART_ADD_PROMPT);

        // Replace placeholders in the template
        return str_replace(
            ['{context}', '{categories}'],
            [$context, $categoryList],
            $promptTemplate
        );
    }

    /**
     * Get the synthesis prompt template.
     */
    public static function getSynthesisPrompt(?int $householdId = null): string
    {
        return Setting::get('ai_prompt_synthesis', $householdId, self::DEFAULT_SYNTHESIS_PROMPT);
    }

    /**
     * Process the orchestrator response into a standardized format.
     */
    protected function processOrchestratorResponse(array $response, AIAgentOrchestrator $orchestrator): array
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
                    'has_response' => !empty($agentResult['response']),
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
        $results = [];
        $parseSource = null;

        \Illuminate\Support\Facades\Log::debug('AnalyzeItemImage: Processing response', [
            'has_synthesized' => !empty($synthesizedText),
            'synthesized_preview' => $synthesizedText ? substr($synthesizedText, 0, 500) : null,
            'agents_count' => count($response['agents'] ?? []),
        ]);

        // Try to parse from synthesized response first
        if ($synthesizedText) {
            $results = $this->parseResults($synthesizedText);
            \Illuminate\Support\Facades\Log::debug('AnalyzeItemImage: Parsed synthesized results', [
                'parsed_count' => count($results ?? []),
                'results_preview' => $results ? json_encode(array_slice($results, 0, 3)) : null,
            ]);
            if (!empty($results)) {
                $parseSource = 'synthesized';
            }
        }

        // If synthesis failed, try to parse from individual agent responses
        if (empty($results) && !empty($response['agents'])) {
            $results = $this->extractResultsFromAgentResponses($response['agents']);
            if (!empty($results)) {
                $parseSource = 'individual_agents';
            }
        }

        // Handle case where we have no results
        if ($results === null || empty($results)) {
            // Return detailed error info instead of throwing
            return [
                'results' => [],
                'agents_used' => $agentsUsed,
                'agents_succeeded' => $agentsSucceeded,
                'agent_details' => $agentDetails,
                'agent_errors' => $agentErrors,
                'primary_agent' => $orchestrator->getPrimaryAgent(),
                'synthesis_agent' => $response['synthesis_agent'] ?? $response['summary_agent'] ?? null,
                'synthesis_error' => $response['synthesis_error'] ?? $response['summary_error'] ?? null,
                'consensus' => [
                    'level' => 'none',
                    'agents_agreeing' => 0,
                    'total_agents' => count($agentsUsed),
                ],
                'total_duration_ms' => $response['total_duration_ms'] ?? 0,
                'parse_source' => null,
                'debug' => [
                    'had_synthesized' => !empty($synthesizedText),
                    'synthesized_preview' => $synthesizedText ? substr($synthesizedText, 0, 200) : null,
                ],
            ];
        }

        $normalizedResults = $this->normalizeResults($results);

        // Calculate consensus info
        $consensus = $this->calculateConsensus($response['agents'] ?? [], $normalizedResults);

        return [
            'results' => $normalizedResults,
            'agents_used' => $agentsUsed,
            'agents_succeeded' => $agentsSucceeded,
            'agent_details' => $agentDetails,
            'agent_errors' => $agentErrors,
            'primary_agent' => $orchestrator->getPrimaryAgent(),
            'synthesis_agent' => $response['synthesis_agent'] ?? $response['summary_agent'] ?? null,
            'synthesis_error' => $response['synthesis_error'] ?? $response['summary_error'] ?? null,
            'consensus' => $consensus,
            'total_duration_ms' => $response['total_duration_ms'] ?? 0,
            'parse_source' => $parseSource,
        ];
    }

    /**
     * Try to extract results from individual agent responses if synthesis failed.
     */
    protected function extractResultsFromAgentResponses(array $agents): ?array
    {
        $allResults = [];

        foreach ($agents as $agentName => $agentData) {
            if (($agentData['success'] ?? false) && !empty($agentData['response'])) {
                $parsed = $this->parseResults($agentData['response']);
                if (is_array($parsed) && !empty($parsed)) {
                    foreach ($parsed as $result) {
                        $result['source_agent'] = $agentName;
                        $allResults[] = $result;
                    }
                }
            }
        }

        if (empty($allResults)) {
            return null;
        }

        // Deduplicate by make+model, keeping highest confidence
        $unique = [];
        foreach ($allResults as $result) {
            $key = strtolower(($result['make'] ?? '') . '|' . ($result['model'] ?? ''));
            if (!isset($unique[$key]) || ($result['confidence'] ?? 0) > ($unique[$key]['confidence'] ?? 0)) {
                $unique[$key] = $result;
            }
        }

        return array_values($unique);
    }

    /**
     * Calculate consensus information from agent responses.
     */
    protected function calculateConsensus(array $agents, array $normalizedResults): array
    {
        if (empty($normalizedResults) || empty($agents)) {
            return [
                'level' => 'none',
                'agents_agreeing' => 0,
                'total_agents' => count($agents),
            ];
        }

        $successfulAgents = array_filter($agents, fn($a) => $a['success'] ?? false);
        $totalSuccessful = count($successfulAgents);

        if ($totalSuccessful <= 1) {
            return [
                'level' => 'single',
                'agents_agreeing' => $totalSuccessful,
                'total_agents' => count($agents),
            ];
        }

        // Check if the top result has agents_agreed field from synthesis
        $topResult = $normalizedResults[0] ?? [];
        $agentsAgreed = $topResult['agents_agreed'] ?? $totalSuccessful;

        $level = match (true) {
            $agentsAgreed >= $totalSuccessful => 'full',
            $agentsAgreed >= $totalSuccessful * 0.5 => 'majority',
            $agentsAgreed >= 2 => 'partial',
            default => 'low',
        };

        return [
            'level' => $level,
            'agents_agreeing' => $agentsAgreed,
            'total_agents' => count($agents),
        ];
    }

    /**
     * Parse JSON results from a response string.
     */
    protected function parseResults(?string $response): ?array
    {
        if (!$response) return null;

        // Clean up common issues
        $response = trim($response);
        
        // Remove markdown code blocks if present
        $response = preg_replace('/^```(?:json)?\s*/i', '', $response);
        $response = preg_replace('/\s*```$/i', '', $response);
        $response = trim($response);

        // Try to extract JSON array from the response
        $jsonPattern = '/\[[\s\S]*?\]/';
        if (preg_match($jsonPattern, $response, $matches)) {
            $parsed = json_decode($matches[0], true);
            if (is_array($parsed)) {
                return $parsed;
            }
        }

        // Try parsing the whole response as JSON
        $parsed = json_decode($response, true);
        if (is_array($parsed)) {
            return $parsed;
        }

        return null;
    }

    /**
     * Normalize and sort results.
     */
    protected function normalizeResults(array $results): array
    {
        $normalizedResults = [];
        
        // Values to treat as empty/unknown
        $unknownValues = ['unknown', 'n/a', 'na', 'not visible', 'not available', 'unidentified', 'none', ''];
        
        foreach ($results as $result) {
            if (isset($result['make']) || isset($result['model']) || isset($result['type'])) {
                $make = trim($result['make'] ?? '');
                $model = trim($result['model'] ?? '');
                $type = trim($result['type'] ?? '');
                
                // Skip results where make is unknown/empty (these aren't useful)
                if (in_array(strtolower($make), $unknownValues)) {
                    continue;
                }
                
                // Clean up model if it's an unknown value - replace with empty string
                if (in_array(strtolower($model), $unknownValues)) {
                    $model = '';
                }
                
                $normalized = [
                    'make' => $make,
                    'model' => $model,
                    'type' => $type,
                    'confidence' => (float) ($result['confidence'] ?? 0.5),
                    'image_url' => $result['image_url'] ?? null,
                ];

                // Include agents_agreed if present (from synthesis)
                if (isset($result['agents_agreed'])) {
                    $normalized['agents_agreed'] = (int) $result['agents_agreed'];
                }

                // Include source_agent if present (fallback mode)
                if (isset($result['source_agent'])) {
                    $normalized['source_agent'] = $result['source_agent'];
                }

                $normalizedResults[] = $normalized;
            }
        }

        // Sort by confidence
        usort($normalizedResults, fn($a, $b) => $b['confidence'] <=> $a['confidence']);

        // Search for product images for each result
        $normalizedResults = $this->enrichWithProductImages($normalizedResults);

        return $normalizedResults;
    }

    /**
     * Enrich results with real product images from web search.
     * Only processes top 3 results for speed.
     */
    protected function enrichWithProductImages(array $results): array
    {
        \Illuminate\Support\Facades\Log::debug('enrichWithProductImages: Starting', [
            'results_count' => count($results),
            'results_preview' => array_map(fn($r) => [
                'make' => $r['make'] ?? '',
                'model' => $r['model'] ?? '',
                'type' => $r['type'] ?? '',
                'has_image_url' => !empty($r['image_url']),
            ], array_slice($results, 0, 3)),
        ]);

        $imageService = new ProductImageSearchService();
        $searchCount = 0;
        $maxSearches = 3; // Only search for top 3 results to avoid timeout

        foreach ($results as $index => $result) {
            // Limit searches for speed
            if ($searchCount >= $maxSearches) {
                \Illuminate\Support\Facades\Log::debug('enrichWithProductImages: Reached max searches', [
                    'max_searches' => $maxSearches,
                    'searches_done' => $searchCount,
                ]);
                break;
            }

            // Skip if already has a valid image URL
            if (!empty($result['image_url'])) {
                \Illuminate\Support\Facades\Log::debug('enrichWithProductImages: Skipping - already has image', [
                    'index' => $index,
                    'image_url' => $result['image_url'],
                ]);
                continue;
            }

            $make = $result['make'] ?? '';
            $model = $result['model'] ?? '';
            $type = $result['type'] ?? '';

            if (empty($make) && empty($model)) {
                \Illuminate\Support\Facades\Log::debug('enrichWithProductImages: Skipping - no make or model', [
                    'index' => $index,
                ]);
                continue;
            }

            // Search for product image
            \Illuminate\Support\Facades\Log::debug('enrichWithProductImages: Searching for image', [
                'index' => $index,
                'make' => $make,
                'model' => $model,
                'type' => $type,
            ]);

            $imageUrl = $imageService->getBestImage($make, $model, $type);
            $searchCount++;

            \Illuminate\Support\Facades\Log::debug('enrichWithProductImages: Image search result', [
                'index' => $index,
                'make' => $make,
                'model' => $model,
                'image_url' => $imageUrl,
                'found' => $imageUrl !== null,
            ]);

            if ($imageUrl) {
                $results[$index]['image_url'] = $imageUrl;
            }
        }

        $imagesFound = count(array_filter($results, fn($r) => !empty($r['image_url'])));
        \Illuminate\Support\Facades\Log::debug('enrichWithProductImages: Completed', [
            'total_results' => count($results),
            'images_found' => $imagesFound,
            'searches_performed' => $searchCount,
        ]);

        return $results;
    }
}
