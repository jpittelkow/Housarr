<?php

namespace App\Services;

use App\Models\Household;
use App\Models\Item;
use App\Models\Location;
use App\Models\MaintenanceLog;
use App\Models\Reminder;
use App\Models\Todo;
use App\Models\Vendor;
use App\Services\StorageService;
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
     * Get the content of a report file with data injected.
     */
    public function getReportFileContent(string $filePath, array $allData = []): ?string
    {
        $disk = StorageService::getDiskForHousehold($this->householdId);
        
        if (!$disk->exists($filePath)) {
            return null;
        }
        
        $html = $disk->get($filePath);
        
        // Inject data as a JSON script tag if data is provided
        if (!empty($allData)) {
            $dataJson = json_encode($allData, JSON_PRETTY_PRINT);
            $dataScript = "<script id=\"report-data\" type=\"application/json\">{$dataJson}</script>";
            
            // Inject before the closing </head> or at the start of <body>
            if (stripos($html, '</head>') !== false) {
                $html = str_ireplace('</head>', "{$dataScript}\n</head>", $html);
            } elseif (stripos($html, '<body') !== false) {
                $html = preg_replace('/(<body[^>]*>)/i', "$1\n{$dataScript}", $html);
            } else {
                // If no head or body, inject at the start
                $html = $dataScript . "\n" . $html;
            }
        }
        
        return $html;
    }
    
    /**
     * Get all report data for a household.
     */
    public function getAllReportData(int $householdId): array
    {
        $items = Item::where('household_id', $householdId)
            ->with(['category', 'vendor', 'location', 'featuredImage', 'parts', 'maintenanceLogs', 'reminders'])
            ->orderBy('name')
            ->get();
        
        $reminders = Reminder::where('household_id', $householdId)
            ->with(['item:id,name', 'user:id,name'])
            ->orderBy('due_date')
            ->get();
        
        $todos = Todo::where('household_id', $householdId)
            ->with(['item:id,name', 'user:id,name'])
            ->orderBy('due_date')
            ->get();
        
        $maintenanceLogs = MaintenanceLog::whereHas('item', function ($query) use ($householdId) {
            $query->where('household_id', $householdId);
        })
            ->with(['item:id,name', 'vendor', 'parts'])
            ->orderBy('date', 'desc')
            ->get();
        
        $vendors = Vendor::where('household_id', $householdId)
            ->orderBy('name')
            ->get();
        
        $locations = Location::where('household_id', $householdId)
            ->with(['paintColors', 'featuredImage'])
            ->orderBy('name')
            ->get();
        
        $itemsCount = $items->count();
        $upcomingReminders = $reminders->where('status', 'pending')
            ->filter(function ($r) {
                return $r->due_date && $r->due_date <= now()->addDays(7);
            })
            ->take(10)
            ->values();
        $overdueReminders = $reminders->where('status', 'pending')
            ->filter(function ($r) {
                return $r->due_date && $r->due_date < now();
            })
            ->take(10)
            ->values();
        $incompleteTodosCount = $todos->whereNull('completed_at')->count();
        
        return [
            'items' => $items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'make' => $item->make,
                    'model' => $item->model,
                    'serial_number' => $item->serial_number,
                    'install_date' => $item->install_date?->toDateString(),
                    'warranty_years' => $item->warranty_years,
                    'maintenance_interval_months' => $item->maintenance_interval_months,
                    'typical_lifespan_years' => $item->typical_lifespan_years,
                    'location' => $item->location,
                    'location_id' => $item->location_id,
                    'location_obj' => $item->location ? [
                        'id' => $item->location->id,
                        'name' => $item->location->name,
                        'icon' => $item->location->icon,
                    ] : null,
                    'category' => $item->category ? [
                        'id' => $item->category->id,
                        'name' => $item->category->name,
                        'icon' => $item->category->icon,
                        'color' => $item->category->color,
                    ] : null,
                    'vendor' => $item->vendor ? [
                        'id' => $item->vendor->id,
                        'name' => $item->vendor->name,
                        'phone' => $item->vendor->phone,
                        'email' => $item->vendor->email,
                    ] : null,
                    'notes' => $item->notes,
                ];
            })->values()->all(),
            'reminders' => $reminders->map(function ($reminder) {
                return [
                    'id' => $reminder->id,
                    'title' => $reminder->title,
                    'description' => $reminder->description,
                    'due_date' => $reminder->due_date?->toDateString(),
                    'status' => $reminder->status,
                    'item' => $reminder->item ? ['id' => $reminder->item->id, 'name' => $reminder->item->name] : null,
                    'user' => $reminder->user ? ['id' => $reminder->user->id, 'name' => $reminder->user->name] : null,
                ];
            })->values()->all(),
            'todos' => $todos->map(function ($todo) {
                return [
                    'id' => $todo->id,
                    'title' => $todo->title,
                    'description' => $todo->description,
                    'priority' => $todo->priority,
                    'due_date' => $todo->due_date?->toDateString(),
                    'completed_at' => $todo->completed_at?->toISOString(),
                    'item' => $todo->item ? ['id' => $todo->item->id, 'name' => $todo->item->name] : null,
                    'user' => $todo->user ? ['id' => $todo->user->id, 'name' => $todo->user->name] : null,
                ];
            })->values()->all(),
            'maintenance_logs' => $maintenanceLogs->map(function ($log) {
                return [
                    'id' => $log->id,
                    'item' => ['id' => $log->item->id, 'name' => $log->item->name],
                    'type' => $log->type,
                    'date' => $log->date?->toDateString(),
                    'cost' => $log->cost,
                    'vendor' => $log->vendor ? ['id' => $log->vendor->id, 'name' => $log->vendor->name] : null,
                    'notes' => $log->notes,
                ];
            })->values()->all(),
            'vendors' => $vendors->map(function ($vendor) {
                return [
                    'id' => $vendor->id,
                    'name' => $vendor->name,
                    'phone' => $vendor->phone,
                    'email' => $vendor->email,
                    'website' => $vendor->website,
                    'address' => $vendor->address,
                ];
            })->values()->all(),
            'locations' => $locations->map(function ($location) {
                return [
                    'id' => $location->id,
                    'name' => $location->name,
                    'icon' => $location->icon,
                    'notes' => $location->notes,
                    'items_count' => $location->items_count ?? 0,
                ];
            })->values()->all(),
            'dashboard' => [
                'items_count' => $itemsCount,
                'upcoming_reminders' => $upcomingReminders->map(function ($r) {
                    return [
                        'id' => $r->id,
                        'title' => $r->title,
                        'due_date' => $r->due_date?->toDateString(),
                        'item' => $r->item ? ['id' => $r->item->id, 'name' => $r->item->name] : null,
                    ];
                })->values()->all(),
                'upcoming_reminders_count' => $upcomingReminders->count(),
                'overdue_reminders' => $overdueReminders->map(function ($r) {
                    return [
                        'id' => $r->id,
                        'title' => $r->title,
                        'due_date' => $r->due_date?->toDateString(),
                        'item' => $r->item ? ['id' => $r->item->id, 'name' => $r->item->name] : null,
                    ];
                })->values()->all(),
                'overdue_reminders_count' => $overdueReminders->count(),
                'incomplete_todos_count' => $incompleteTodosCount,
            ],
        ];
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
IMPORTANT: The user's actual data is PRE-INJECTED into the HTML. You MUST use this data in your report. Do NOT create empty templates or ask the user for data - the data already exists in the system.

**How to access data:**
The data is available in a script tag with id="report-data". Access it like this:

```javascript
// Get the pre-injected data
const dataScript = document.getElementById('report-data');
const allData = dataScript ? JSON.parse(dataScript.textContent) : {};

// Access specific data types:
const items = allData.items || [];
const reminders = allData.reminders || [];
const todos = allData.todos || [];
const maintenance_logs = allData.maintenance_logs || [];
const vendors = allData.vendors || [];
const locations = allData.locations || [];
const dashboard = allData.dashboard || {};
```

**Data Structure:**
The following data types are available in the pre-injected data:

{$dataTypesJson}

**Example usage:**
```javascript
const { useState, useEffect } = React;

function ReportComponent() {
  // Get pre-injected data (no fetch needed!)
  const dataScript = document.getElementById('report-data');
  const allData = dataScript ? JSON.parse(dataScript.textContent) : {};
  const items = allData.items || [];
  
  // Calculate warranty expiration for items
  const itemsWithWarranty = items.map(item => {
    if (item.install_date && item.warranty_years) {
      const installDate = new Date(item.install_date);
      const expirationDate = new Date(installDate);
      expirationDate.setFullYear(expirationDate.getFullYear() + item.warranty_years);
      const daysRemaining = Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24));
      
      return {
        ...item,
        warranty_expiration_date: expirationDate.toISOString().split('T')[0],
        warranty_days_remaining: daysRemaining,
        warranty_status: daysRemaining > 0 ? 'Active' : (daysRemaining <= 0 ? 'Expired' : 'No warranty info')
      };
    }
    return { ...item, warranty_status: 'No warranty info' };
  });
  
  return (
    <div className="p-6">
      <h1 className="text-display-sm font-semibold text-gray-900 mb-4">Items Report</h1>
      {itemsWithWarranty.map(item => (
        <div key={item.id} className="card p-4 mb-4">
          <h2 className="text-lg font-medium">{item.name}</h2>
          <p>Warranty Status: {item.warranty_status}</p>
          {item.warranty_expiration_date && (
            <p>Expires: {item.warranty_expiration_date} ({item.warranty_days_remaining} days remaining)</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Calculated Fields:**
For items, you can calculate warranty expiration:
- warranty_expiration_date = install_date + (warranty_years * 365 days)
- warranty_days_remaining = (warranty_expiration_date - today) in days
- warranty_status = "Active" if days_remaining > 0, "Expired" if <= 0, "No warranty info" if warranty_years is null

**CRITICAL:** 
1. The data is ALREADY in the HTML - do NOT use fetch() or make API calls
2. Always use the actual data from the pre-injected script tag
3. Never create placeholder templates or ask users to fill in data manually
4. The data is available immediately - no loading states needed for data fetching

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
        $prompt .= "1. The user's data is PRE-INJECTED into the HTML in a script tag with id='report-data'.\n";
        $prompt .= "2. DO NOT use fetch() or make API calls - the data is already available in the page.\n";
        $prompt .= "3. Access data using: const allData = JSON.parse(document.getElementById('report-data').textContent);\n";
        $prompt .= "4. DO NOT create empty templates, placeholder tables, or ask the user to fill in data.\n";
        $prompt .= "5. DO NOT respond conversationally - generate ONLY the HTML code for the report.\n";
        $prompt .= "6. Calculate derived fields (like warranty expiration) using the formulas provided.\n";
        $prompt .= "7. Display the ACTUAL data from the pre-injected data object.\n";
        $prompt .= "8. If the user asks for warranty information, calculate warranty_expiration_date from install_date + warranty_years.\n";
        $prompt .= "9. If the user asks for 'how much warranty is left', calculate warranty_days_remaining.\n";
        $prompt .= "10. The data is available immediately - no loading states needed for data fetching.\n";
        $prompt .= "11. The report should be functional, visually appealing, and match the app's design.\n\n";
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
