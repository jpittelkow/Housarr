<?php

namespace App\Services;

use App\Models\Item;
use App\Models\MaintenanceLog;
use Illuminate\Support\Collection;

/**
 * Service for handling AI chat interactions.
 * 
 * Provides context-aware chat functionality that can use:
 * - Item details (make, model, warranty, maintenance info)
 * - PDF manual content
 * - Service/maintenance history
 * - Parts information
 * - General AI knowledge
 */
class ChatService
{
    protected AIAgentOrchestrator $orchestrator;
    protected PdfTextService $pdfService;
    protected ?int $householdId;

    public function __construct(?int $householdId = null)
    {
        $this->householdId = $householdId;
        $this->orchestrator = AIAgentOrchestrator::forHousehold($householdId);
        $this->pdfService = new PdfTextService();
    }

    /**
     * Create a ChatService instance for a household.
     */
    public static function forHousehold(?int $householdId): self
    {
        return new self($householdId);
    }

    /**
     * Check if AI chat is available.
     */
    public function isAvailable(): bool
    {
        return $this->orchestrator->isAvailable();
    }

    /**
     * Get the primary agent being used.
     */
    public function getPrimaryAgent(): ?string
    {
        return $this->orchestrator->getPrimaryOrFirstAvailable();
    }

    /**
     * Send a general chat message (not item-specific).
     */
    public function chat(string $message, array $conversationHistory = []): array
    {
        if (!$this->isAvailable()) {
            return [
                'success' => false,
                'error' => 'AI is not configured. Please configure an AI provider in Settings.',
                'response' => null,
            ];
        }

        $systemPrompt = $this->buildGeneralSystemPrompt();
        $prompt = $this->buildChatPrompt($systemPrompt, $message, $conversationHistory);

        return $this->sendToAI($prompt);
    }

    /**
     * Send a chat message with item context.
     */
    public function chatWithItemContext(
        Item $item,
        string $message,
        array $conversationHistory = [],
        bool $includeManuals = true,
        bool $includeServiceHistory = true,
        bool $includeParts = true
    ): array {
        if (!$this->isAvailable()) {
            return [
                'success' => false,
                'error' => 'AI is not configured. Please configure an AI provider in Settings.',
                'response' => null,
            ];
        }

        // Build context from item data
        $context = $this->buildItemContext($item, $includeManuals, $includeServiceHistory, $includeParts);
        
        $systemPrompt = $this->buildItemSystemPrompt($item, $context);
        $prompt = $this->buildChatPrompt($systemPrompt, $message, $conversationHistory);

        $result = $this->sendToAI($prompt);
        
        // Add context metadata to response
        $result['context'] = [
            'item_id' => $item->id,
            'item_name' => $item->name,
            'manuals_included' => $context['manuals_count'] ?? 0,
            'service_history_included' => $context['service_logs_count'] ?? 0,
            'parts_included' => $context['parts_count'] ?? 0,
        ];

        return $result;
    }

    /**
     * Build context data from an item.
     */
    protected function buildItemContext(
        Item $item,
        bool $includeManuals = true,
        bool $includeServiceHistory = true,
        bool $includeParts = true
    ): array {
        $context = [
            'item_details' => $this->formatItemDetails($item),
            'manuals_count' => 0,
            'manuals_text' => null,
            'service_logs_count' => 0,
            'service_history' => null,
            'parts_count' => 0,
            'parts_list' => null,
        ];

        // Extract manual content
        if ($includeManuals && $item->files) {
            $manualData = $this->pdfService->extractFromFiles($item->files);
            if ($manualData['text']) {
                // Limit manual text for chat context (shorter than parts extraction)
                $context['manuals_text'] = substr($manualData['text'], 0, 50000);
                $context['manuals_count'] = $manualData['files_processed'];
            }
        }

        // Format service history
        if ($includeServiceHistory && $item->maintenanceLogs) {
            $context['service_history'] = $this->formatServiceHistory($item->maintenanceLogs);
            $context['service_logs_count'] = $item->maintenanceLogs->count();
        }

        // Format parts list
        if ($includeParts && $item->parts) {
            $context['parts_list'] = $this->formatPartsList($item->parts);
            $context['parts_count'] = $item->parts->count();
        }

        return $context;
    }

    /**
     * Format item details for context.
     */
    protected function formatItemDetails(Item $item): string
    {
        $details = [];
        $details[] = "Name: {$item->name}";
        
        if ($item->make) $details[] = "Make: {$item->make}";
        if ($item->model) $details[] = "Model: {$item->model}";
        if ($item->serial_number) $details[] = "Serial Number: {$item->serial_number}";
        if ($item->category) $details[] = "Category: {$item->category->name}";
        if ($item->location) $details[] = "Location: " . ($item->location->name ?? $item->location);
        if ($item->install_date) $details[] = "Install Date: {$item->install_date->format('Y-m-d')}";
        if ($item->warranty_years) $details[] = "Warranty: {$item->warranty_years} years";
        if ($item->maintenance_interval_months) $details[] = "Maintenance Interval: {$item->maintenance_interval_months} months";
        if ($item->typical_lifespan_years) $details[] = "Typical Lifespan: {$item->typical_lifespan_years} years";
        if ($item->notes) $details[] = "Notes: {$item->notes}";

        return implode("\n", $details);
    }

    /**
     * Format service/maintenance history for context.
     */
    protected function formatServiceHistory(Collection $logs): string
    {
        if ($logs->isEmpty()) {
            return "No service history recorded.";
        }

        $formatted = [];
        foreach ($logs->sortByDesc('date')->take(20) as $log) {
            $entry = "- {$log->date->format('Y-m-d')}: {$log->type}";
            if ($log->cost) $entry .= " (Cost: \${$log->cost})";
            if ($log->vendor) $entry .= " by {$log->vendor->name}";
            if ($log->notes) $entry .= "\n  Notes: {$log->notes}";
            if ($log->parts && $log->parts->count() > 0) {
                $partNames = $log->parts->pluck('name')->join(', ');
                $entry .= "\n  Parts used: {$partNames}";
            }
            $formatted[] = $entry;
        }

        return implode("\n", $formatted);
    }

    /**
     * Format parts list for context.
     */
    protected function formatPartsList(Collection $parts): string
    {
        if ($parts->isEmpty()) {
            return "No parts registered.";
        }

        $formatted = [];
        foreach ($parts as $part) {
            $entry = "- {$part->name} ({$part->type})";
            if ($part->part_number) $entry .= " - Part #: {$part->part_number}";
            if ($part->price) $entry .= " - Price: \${$part->price}";
            if ($part->notes) $entry .= "\n  Notes: {$part->notes}";
            $formatted[] = $entry;
        }

        return implode("\n", $formatted);
    }

    /**
     * Build the general system prompt (no item context).
     */
    protected function buildGeneralSystemPrompt(): string
    {
        return <<<PROMPT
You are a helpful home maintenance assistant. You help homeowners with questions about:
- Home appliances and equipment maintenance
- Troubleshooting common issues
- Understanding product manuals and specifications
- Replacement parts and where to find them
- Maintenance schedules and best practices
- DIY repairs vs when to call a professional

Be concise, practical, and safety-conscious in your responses. If a repair could be dangerous (electrical, gas, structural), always recommend consulting a professional.

When you don't have specific information about a product, provide general guidance based on typical products in that category.
PROMPT;
    }

    /**
     * Build the system prompt for item-specific chat.
     */
    protected function buildItemSystemPrompt(Item $item, array $context): string
    {
        $prompt = <<<PROMPT
You are a helpful home maintenance assistant. You are helping with questions about a specific product in the user's home.

=== PRODUCT INFORMATION ===
{$context['item_details']}

PROMPT;

        if ($context['manuals_text']) {
            $prompt .= <<<MANUAL

=== PRODUCT MANUAL CONTENT ===
The following is extracted text from the product manual(s). Reference this for specific part numbers, procedures, specifications, and troubleshooting steps:

{$context['manuals_text']}

MANUAL;
        }

        if ($context['service_history']) {
            $prompt .= <<<SERVICE

=== SERVICE HISTORY ===
Previous maintenance and repairs for this item:

{$context['service_history']}

SERVICE;
        }

        if ($context['parts_list']) {
            $prompt .= <<<PARTS

=== REGISTERED PARTS ===
Parts associated with this item:

{$context['parts_list']}

PARTS;
        }

        $prompt .= <<<INSTRUCTIONS

=== INSTRUCTIONS ===
- Answer questions about this specific product using the information provided above
- If the manual content is available, reference specific sections, part numbers, or procedures when relevant
- Consider the service history when discussing maintenance needs or recurring issues
- Be concise, practical, and safety-conscious
- If a repair could be dangerous, recommend consulting a professional
- If you don't have specific information, provide general guidance based on typical products of this type
INSTRUCTIONS;

        return $prompt;
    }

    /**
     * Build the full chat prompt with conversation history.
     */
    protected function buildChatPrompt(string $systemPrompt, string $userMessage, array $conversationHistory): string
    {
        $prompt = $systemPrompt . "\n\n";

        // Add conversation history
        if (!empty($conversationHistory)) {
            $prompt .= "=== CONVERSATION HISTORY ===\n";
            foreach ($conversationHistory as $entry) {
                $role = $entry['role'] === 'user' ? 'User' : 'Assistant';
                $prompt .= "{$role}: {$entry['content']}\n\n";
            }
        }

        $prompt .= "User: {$userMessage}\n\nAssistant:";

        return $prompt;
    }

    /**
     * Send prompt to AI and return response.
     */
    protected function sendToAI(string $prompt): array
    {
        $startTime = microtime(true);
        
        $agent = $this->orchestrator->getPrimaryOrFirstAvailable();
        if (!$agent) {
            return [
                'success' => false,
                'error' => 'No AI agent available',
                'response' => null,
            ];
        }

        $result = $this->orchestrator->callAgent($agent, $prompt, [
            'max_tokens' => 2048,
            'timeout' => 60,
        ]);

        $duration = (int) ((microtime(true) - $startTime) * 1000);

        if ($result['success'] && $result['response']) {
            return [
                'success' => true,
                'response' => trim($result['response']),
                'agent' => $agent,
                'duration_ms' => $duration,
            ];
        }

        return [
            'success' => false,
            'error' => $result['error'] ?? 'Failed to get response from AI',
            'response' => null,
            'agent' => $agent,
            'duration_ms' => $duration,
        ];
    }

    /**
     * Get suggested questions for an item.
     */
    public function getSuggestedQuestions(Item $item): array
    {
        $suggestions = [];

        // General questions
        $suggestions[] = "What maintenance does this need?";
        $suggestions[] = "What are common problems with this?";
        
        // Category-specific suggestions
        if ($item->category) {
            $categoryName = strtolower($item->category->name);
            
            if (str_contains($categoryName, 'hvac') || str_contains($categoryName, 'air')) {
                $suggestions[] = "How often should I change the filter?";
                $suggestions[] = "Why is it not cooling/heating properly?";
            } elseif (str_contains($categoryName, 'appliance')) {
                $suggestions[] = "How do I clean this properly?";
                $suggestions[] = "What do the error codes mean?";
            } elseif (str_contains($categoryName, 'plumb')) {
                $suggestions[] = "How do I prevent clogs?";
                $suggestions[] = "What causes leaks in this?";
            } elseif (str_contains($categoryName, 'electric')) {
                $suggestions[] = "Is this safe to repair myself?";
                $suggestions[] = "What's the power consumption?";
            }
        }

        // If has manual, add manual-related question
        if ($item->files && $item->files->where('mime_type', 'application/pdf')->count() > 0) {
            $suggestions[] = "What does the manual say about troubleshooting?";
        }

        // If has service history, add history-related question
        if ($item->maintenanceLogs && $item->maintenanceLogs->count() > 0) {
            $suggestions[] = "Based on my service history, what should I do next?";
        }

        // Warranty question if applicable
        if ($item->warranty_years && $item->install_date) {
            $suggestions[] = "Is this still under warranty?";
        }

        return array_slice($suggestions, 0, 6); // Limit to 6 suggestions
    }
}
