<?php

namespace App\Services;

use App\Models\Household;
use App\Models\Item;
use App\Models\Location;
use App\Models\MaintenanceLog;
use App\Models\Reminder;
use App\Models\Todo;
use App\Models\Vendor;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Service for generating AI-powered reports.
 * 
 * Uses Claude to generate HTML/React reports based on user chat conversations.
 * Reports are saved as HTML files and can fetch fresh data when viewed.
 */
class ReportService
{
    protected AIAgentOrchestrator $orchestrator;
    protected ?int $householdId;

    public function __construct(?int $householdId = null)
    {
        $this->householdId = $householdId;
        $this->orchestrator = AIAgentOrchestrator::forHousehold($householdId);
    }

    /**
     * Create a ReportService instance for a household.
     */
    public static function forHousehold(?int $householdId): self
    {
        return new self($householdId);
    }

    /**
     * Check if AI is available for report generation.
     */
    public function isAvailable(): bool
    {
        return $this->orchestrator->isAvailable();
    }

    /**
     * Generate a report based on conversation history.
     * 
     * @param array $conversationHistory Array of messages with 'role' and 'content'
     * @return array ['success' => bool, 'html' => string|null, 'error' => string|null]
     */
    public function generateReport(array $conversationHistory): array
    {
        if (!$this->isAvailable()) {
            return [
                'success' => false,
                'html' => null,
                'error' => 'AI is not configured. Please configure an AI provider in Settings.',
            ];
        }

        // Build the system prompt with design system and data structure info
        $systemPrompt = $this->buildReportSystemPrompt();
        
        // Build the full prompt with conversation history
        $prompt = $this->buildGenerationPrompt($systemPrompt, $conversationHistory);

        // Call Claude to generate the report
        $agent = $this->orchestrator->getPrimaryOrFirstAvailable();
        if (!$agent) {
            return [
                'success' => false,
                'html' => null,
                'error' => 'No AI agent available',
            ];
        }

        $result = $this->orchestrator->callAgent($agent, $prompt, [
            'max_tokens' => 8000, // Larger token limit for code generation
            'timeout' => 120, // Longer timeout for code generation
        ]);

        if (!$result['success'] || !$result['response']) {
            return [
                'success' => false,
                'html' => null,
                'error' => $result['error'] ?? 'Failed to generate report',
            ];
        }

        // Extract HTML from response (Claude might wrap it in markdown code blocks)
        $html = $this->extractHtmlFromResponse($result['response']);

        // Validate the generated HTML
        if (!$this->validateGeneratedHtml($html)) {
            return [
                'success' => false,
                'html' => null,
                'error' => 'Generated report code is invalid or incomplete',
            ];
        }

        return [
            'success' => true,
            'html' => $html,
            'error' => null,
        ];
    }

    /**
     * Save generated report HTML to storage.
     * 
     * @param string $html The generated HTML content
     * @param int $reportId The report ID
     * @return string The file path
     */
    public function saveReportFile(string $html, int $reportId): string
    {
        $disk = StorageService::getDiskForHousehold($this->householdId);
        $path = "reports/{$this->householdId}/{$reportId}.html";
        
        $disk->put($path, $html);
        
        return $path;
    }

    /**
     * Delete a report file from storage.
     */
    public function deleteReportFile(string $filePath): bool
    {
        $disk = StorageService::getDiskForHousehold($this->householdId);
        return $disk->delete($filePath);
    }

    /**
     * Get the content of a report file.
     */
    public function getReportFileContent(string $filePath): ?string
    {
        $disk = StorageService::getDiskForHousehold($this->householdId);
        
        if (!$disk->exists($filePath)) {
            return null;
        }
        
        return $disk->get($filePath);
    }

    /**
     * Get available data types and their structure for reports.
     */
    public function getAvailableDataTypes(): array
    {
        return [
            'items' => [
                'description' => 'All household items with their details, categories, locations, and relationships',
                'endpoint' => '/api/reports/data/items',
                'response_key' => 'items', // The JSON response will have { "items": [...] }
                'fields' => [
                    'id' => 'number - Unique item identifier',
                    'name' => 'string - Item name (e.g., "Refrigerator", "HVAC System")',
                    'make' => 'string | null - Manufacturer name (e.g., "Samsung", "Lennox")',
                    'model' => 'string | null - Model number',
                    'serial_number' => 'string | null - Serial number',
                    'install_date' => 'string | null - Installation date in YYYY-MM-DD format',
                    'warranty_years' => 'number | null - Warranty period in years',
                    'maintenance_interval_months' => 'number | null - Recommended maintenance interval in months',
                    'typical_lifespan_years' => 'number | null - Expected lifespan in years',
                    'location' => 'string | null - Location name (legacy field)',
                    'location_id' => 'number | null - Location ID',
                    'location_obj' => 'object | null - Full location object with name, icon, etc.',
                    'category' => 'object | null - Category object with id, name, icon, color',
                    'vendor' => 'object | null - Vendor object with id, name, contact info',
                    'notes' => 'string | null - Additional notes',
                    'parts' => 'array - List of parts (replacement and consumable)',
                    'maintenanceLogs' => 'array - Maintenance history records',
                    'reminders' => 'array - Associated reminders',
                ],
                'calculations' => [
                    'warranty_expiration_date' => 'If install_date and warranty_years are both present: new Date(install_date) + (warranty_years * 365 days). Format as YYYY-MM-DD.',
                    'warranty_days_remaining' => 'If warranty_expiration_date exists: Math.ceil((new Date(warranty_expiration_date) - new Date()) / (1000 * 60 * 60 * 24)). Can be negative if expired.',
                    'warranty_status' => 'If warranty_days_remaining > 0: "Active", if warranty_days_remaining <= 0: "Expired", if warranty_years is null: "No warranty info"',
                ],
                'example' => [
                    'id' => 1,
                    'name' => 'Refrigerator',
                    'make' => 'Samsung',
                    'model' => 'RF28R7351SG',
                    'serial_number' => 'SN123456',
                    'install_date' => '2022-01-15',
                    'warranty_years' => 5,
                    'maintenance_interval_months' => 6,
                    'typical_lifespan_years' => 15,
                    'location' => 'Kitchen',
                    'location_obj' => ['id' => 1, 'name' => 'Kitchen', 'icon' => 'chef-hat'],
                    'category' => ['id' => 1, 'name' => 'Appliances', 'icon' => 'refrigerator'],
                    'vendor' => ['id' => 1, 'name' => 'Best Buy', 'phone' => '555-1234'],
                ],
            ],
            'reminders' => [
                'description' => 'All reminders with due dates, status, and associated items',
                'endpoint' => '/api/reports/data/reminders',
                'response_key' => 'reminders',
                'fields' => [
                    'id' => 'number - Unique reminder identifier',
                    'title' => 'string - Reminder title',
                    'description' => 'string | null - Reminder description',
                    'due_date' => 'string - Due date in YYYY-MM-DD format',
                    'status' => 'string - Status: "pending" or "completed"',
                    'item' => 'object | null - Associated item object',
                    'user' => 'object | null - User who created the reminder',
                ],
                'calculations' => [
                    'is_overdue' => 'due_date < today AND status === "pending"',
                    'days_until_due' => 'Math.ceil((new Date(due_date) - new Date()) / (1000 * 60 * 60 * 24))',
                    'days_overdue' => 'If is_overdue: Math.abs(days_until_due), else 0',
                ],
            ],
            'todos' => [
                'description' => 'All todos with priorities, due dates, and completion status',
                'endpoint' => '/api/reports/data/todos',
                'response_key' => 'todos',
                'fields' => [
                    'id' => 'number - Unique todo identifier',
                    'title' => 'string - Todo title',
                    'description' => 'string | null - Todo description',
                    'priority' => 'string - Priority: "low", "medium", or "high"',
                    'due_date' => 'string | null - Due date in YYYY-MM-DD format',
                    'completed_at' => 'string | null - Completion date in ISO format, null if incomplete',
                    'item' => 'object | null - Associated item object',
                    'user' => 'object | null - User who created the todo',
                ],
                'calculations' => [
                    'is_complete' => 'completed_at !== null',
                    'is_overdue' => 'due_date !== null && completed_at === null && new Date(due_date) < new Date()',
                ],
            ],
            'maintenance_logs' => [
                'description' => 'All maintenance and service history records',
                'endpoint' => '/api/reports/data/maintenance-logs',
                'response_key' => 'maintenance_logs',
                'fields' => [
                    'id' => 'number - Unique log identifier',
                    'item' => 'object - Associated item object',
                    'type' => 'string - Type of maintenance (e.g., "repair", "service", "inspection")',
                    'date' => 'string - Date in YYYY-MM-DD format',
                    'cost' => 'number | null - Cost in dollars',
                    'vendor' => 'object | null - Vendor who performed the work',
                    'notes' => 'string | null - Additional notes',
                    'parts' => 'array - Parts used/replaced',
                ],
            ],
            'vendors' => [
                'description' => 'All vendors with contact information and categories',
                'endpoint' => '/api/reports/data/vendors',
                'response_key' => 'vendors',
                'fields' => [
                    'id' => 'number - Unique vendor identifier',
                    'name' => 'string - Vendor name',
                    'category' => 'object | null - Vendor category',
                    'phone' => 'string | null - Phone number',
                    'email' => 'string | null - Email address',
                    'website' => 'string | null - Website URL',
                    'address' => 'string | null - Physical address',
                ],
            ],
            'locations' => [
                'description' => 'All locations/rooms with paint colors and details',
                'endpoint' => '/api/reports/data/locations',
                'response_key' => 'locations',
                'fields' => [
                    'id' => 'number - Unique location identifier',
                    'name' => 'string - Location name (e.g., "Kitchen", "Living Room")',
                    'icon' => 'string | null - Icon identifier',
                    'notes' => 'string | null - Additional notes',
                    'items_count' => 'number - Number of items in this location',
                    'paint_colors' => 'array - Paint colors used in this location',
                    'images' => 'array - Location images',
                ],
            ],
            'dashboard' => [
                'description' => 'Dashboard summary with counts and overview statistics',
                'endpoint' => '/api/reports/data/dashboard',
                'response_key' => 'dashboard',
                'fields' => [
                    'items_count' => 'number - Total number of items',
                    'upcoming_reminders' => 'array - Reminders due in next 7 days',
                    'upcoming_reminders_count' => 'number - Count of upcoming reminders',
                    'overdue_reminders' => 'array - Overdue reminders',
                    'overdue_reminders_count' => 'number - Count of overdue reminders',
                    'incomplete_todos' => 'array - Incomplete todos',
                    'incomplete_todos_count' => 'number - Count of incomplete todos',
                ],
            ],
        ];
    }

    /**
     * Build the system prompt for report generation.
     */
    protected function buildReportSystemPrompt(): string
    {
        $dataTypes = $this->getAvailableDataTypes();
        $dataTypesJson = json_encode($dataTypes, JSON_PRETTY_PRINT);

        return <<<PROMPT
You are an expert React/HTML developer creating a custom report component for a home management application.

=== TASK ===
Generate a complete, standalone HTML file that contains a React component for displaying a custom report. The component should:
1. Fetch fresh data from the API endpoints provided
2. Use the exact design system specified below
3. Be fully functional and self-contained
4. Include proper error handling and loading states

=== DESIGN SYSTEM ===
The application uses Tailwind CSS with the following color palette and design tokens:

**Colors:**
- Primary (Purple): primary-600 (#7F56D9), primary-500 (#9E77ED), primary-400 (#B692F6)
- Gray: gray-50 (#FAFAFA), gray-100 (#F5F5F5), gray-200 (#E9EAEB), gray-800 (#252B37), gray-900 (#181D27)
- Success: success-600 (#079455), success-500 (#17B26A)
- Warning: warning-600 (#DC6803), warning-500 (#F79009)
- Error: error-600 (#D92D20), error-500 (#F04438)

**Typography:**
- Display: text-display-sm (1.875rem), text-display-xs (1.5rem)
- Body: text-text-md (1rem), text-text-sm (0.875rem)
- Font: Inter, system-ui, sans-serif

**Components:**
- Cards: bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs
- Buttons: bg-primary-600 text-white rounded-lg px-4 py-2 hover:bg-primary-700
- Badges: inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium
- Inputs: block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5

**Spacing:** Use Tailwind spacing scale (4px grid: 1=4px, 2=8px, 3=12px, 4=16px, 6=24px, 8=32px)

=== AVAILABLE DATA ===
IMPORTANT: The user's actual data is available via API endpoints. You MUST fetch this data and use it in your report. Do NOT create empty templates or ask the user for data - the data already exists in the system.

The following data types are available via API endpoints:

{$dataTypesJson}

**How to fetch data:**
1. Use fetch('/api/reports/data/{dataType}') where {dataType} is one of: items, reminders, todos, maintenance-logs, vendors, locations, or dashboard
2. The response will be JSON with a key matching the data type (e.g., { "items": [...] } or { "reminders": [...] })
3. Parse the JSON and use the actual data in your report
4. Handle loading states while fetching
5. Handle errors gracefully

**Example fetch code:**
```javascript
const [data, setData] = React.useState(null);
const [loading, setLoading] = React.useState(true);
const [error, setError] = React.useState(null);

React.useEffect(() => {
  fetch('/api/reports/data/items')
    .then(res => res.json())
    .then(result => {
      setData(result.items); // Note: response key is 'items'
      setLoading(false);
    })
    .catch(err => {
      setError(err.message);
      setLoading(false);
    });
}, []);
```

**Calculated Fields:**
For items, you can calculate warranty expiration:
- warranty_expiration_date = install_date + (warranty_years * 365 days)
- warranty_days_remaining = (warranty_expiration_date - today) in days
- warranty_status = "Active" if days_remaining > 0, "Expired" if <= 0, "No warranty info" if warranty_years is null

**CRITICAL:** Always use the actual data from the API. Never create placeholder templates or ask users to fill in data manually.

=== REQUIREMENTS ===
1. Create a complete HTML file with embedded React (use CDN: https://unpkg.com/react@18/umd/react.production.min.js and https://unpkg.com/react-dom@18/umd/react-dom.production.min.js)
2. Include Tailwind CSS via CDN: https://cdn.tailwindcss.com
3. The component should fetch data from the appropriate endpoints based on what the user requested
4. Display data in a clean, organized format using cards, tables, or lists
5. Include loading states (spinner or skeleton)
6. Include error handling with user-friendly messages
7. Use the exact color classes and design tokens specified above
8. Make it responsive and work in both light and dark mode (use dark: classes)
9. The component should be self-contained and work when the HTML file is opened

=== OUTPUT FORMAT ===
Output ONLY the complete HTML code. Do not include markdown code blocks, explanations, or any other text. Just the raw HTML that can be saved and executed directly.

The HTML should:
- Include <!DOCTYPE html>, <html>, <head>, and <body> tags
- Load React and ReactDOM from CDN
- Load Tailwind CSS from CDN
- Contain a <div id="root"></div> where the React component renders
- Include a script that renders the React component

=== EXAMPLE STRUCTURE ===
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
</head>
<body class="bg-gray-50 dark:bg-gray-950">
    <div id="root"></div>
    <script>
        // React component code here
        const { useState, useEffect } = React;
        // ... component implementation
        ReactDOM.render(React.createElement(ReportComponent), document.getElementById('root'));
    </script>
</body>
</html>
PROMPT;
    }

    /**
     * Build the full generation prompt with conversation history.
     */
    protected function buildGenerationPrompt(string $systemPrompt, array $conversationHistory): string
    {
        $prompt = $systemPrompt . "\n\n";
        
        $prompt .= "=== USER REQUIREMENTS ===\n";
        $prompt .= "Based on the following conversation, generate a report that matches what the user requested:\n\n";
        
        // Add conversation history
        foreach ($conversationHistory as $entry) {
            $role = $entry['role'] === 'user' ? 'User' : 'Assistant';
            $prompt .= "{$role}: {$entry['content']}\n\n";
        }
        
        $prompt .= "\n=== CRITICAL INSTRUCTIONS ===\n";
        $prompt .= "1. The user's data ALREADY EXISTS in the system. You MUST fetch it from the API endpoints.\n";
        $prompt .= "2. DO NOT create empty templates, placeholder tables, or ask the user to fill in data.\n";
        $prompt .= "3. DO NOT respond conversationally - generate ONLY the HTML code for the report.\n";
        $prompt .= "4. Use fetch() to get data from /api/reports/data/{dataType} endpoints.\n";
        $prompt .= "5. Calculate derived fields (like warranty expiration) using the formulas provided.\n";
        $prompt .= "6. Display the ACTUAL data from the API response.\n";
        $prompt .= "7. If the user asks for warranty information, calculate warranty_expiration_date from install_date + warranty_years.\n";
        $prompt .= "8. If the user asks for 'how much warranty is left', calculate warranty_days_remaining.\n";
        $prompt .= "9. The report should be functional, visually appealing, and match the app's design.\n\n";
        $prompt .= "Generate the complete HTML file now. Output ONLY the HTML code, no explanations:";
        
        return $prompt;
    }

    /**
     * Extract HTML from Claude's response (may be wrapped in markdown code blocks).
     */
    protected function extractHtmlFromResponse(string $response): string
    {
        // Remove markdown code blocks if present
        $html = preg_replace('/```html\s*/i', '', $response);
        $html = preg_replace('/```\s*/', '', $html);
        $html = trim($html);
        
        return $html;
    }

    /**
     * Validate the generated HTML.
     */
    protected function validateGeneratedHtml(string $html): bool
    {
        // Basic validation: should contain essential HTML structure
        $hasDoctype = stripos($html, '<!DOCTYPE') !== false || stripos($html, '<html') !== false;
        $hasRoot = stripos($html, 'id="root"') !== false || stripos($html, "id='root'") !== false;
        $hasReact = stripos($html, 'react') !== false || stripos($html, 'React') !== false;
        
        return $hasDoctype && $hasRoot && $hasReact;
    }
}
