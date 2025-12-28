<?php

namespace App\Actions\Items;

use App\Services\AIService;
use Illuminate\Http\UploadedFile;

class AnalyzeItemImageAction
{
    public function execute(?UploadedFile $file, ?array $categories = [], ?int $householdId = null, ?string $query = null): array
    {
        $aiService = AIService::forHousehold($householdId);

        if (!$aiService->isAvailable()) {
            throw new \Exception('AI is not configured. Please configure an AI provider in Settings.');
        }

        $base64Image = null;
        $mimeType = null;

        if ($file) {
            $base64Image = base64_encode(file_get_contents($file->getRealPath()));
            $mimeType = $file->getMimeType();
        }

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

        $prompt = <<<PROMPT
$context
Identify the following:
1. Make/Manufacturer (e.g., Carrier, GE, Samsung, Whirlpool)
2. Model number (look for model plates, labels, or distinctive features)
3. Product type/category

{$categoryList}

Return up to 10 possible matches ranked by confidence.
You MUST return ONLY a valid JSON array with no additional text, markdown, or explanation.

Format:
[
  { "make": "Brand Name", "model": "Model Number", "type": "Category Name", "confidence": 0.95 },
  { "make": "Brand Name", "model": "Alternative Model", "type": "Category Name", "confidence": 0.80 }
]

If you cannot identify the product, return an empty array: []
PROMPT;

        if ($base64Image) {
            $results = $aiService->analyzeImage($base64Image, $mimeType, $prompt);
        } else {
            $response = $aiService->complete($prompt);
            $results = $this->parseResults($response);
        }

        if ($results === null) {
            throw new \Exception('Failed to analyze product. Please try again.');
        }

        return $this->normalizeResults($results);
    }

    protected function parseResults(?string $response): ?array
    {
        if (!$response) return null;

        // Try to extract JSON from the response
        $jsonPattern = '/\[[\s\S]*\]/';
        if (preg_match($jsonPattern, $response, $matches)) {
            return json_decode($matches[0], true);
        }

        return json_decode($response, true);
    }

    protected function normalizeResults(array $results): array
    {
        $normalizedResults = [];
        foreach ($results as $result) {
            if (isset($result['make']) || isset($result['model']) || isset($result['type'])) {
                $normalizedResults[] = [
                    'make' => $result['make'] ?? '',
                    'model' => $result['model'] ?? '',
                    'type' => $result['type'] ?? '',
                    'confidence' => (float) ($result['confidence'] ?? 0.5),
                ];
            }
        }

        // Sort by confidence
        usort($normalizedResults, fn($a, $b) => $b['confidence'] <=> $a['confidence']);

        return $normalizedResults;
    }
}

