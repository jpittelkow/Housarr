<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class ReportController extends Controller
{
    /**
     * List all reports for the household.
     */
    public function index(Request $request): JsonResponse
    {
        $householdId = $request->user()->household_id;

        $reports = Report::forHousehold($householdId)
            ->with('createdBy:id,name')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'reports' => $reports->map(function ($report) {
                return [
                    'id' => $report->id,
                    'name' => $report->name,
                    'description' => $report->description,
                    'created_at' => $report->created_at->toISOString(),
                    'updated_at' => $report->updated_at->toISOString(),
                    'created_by' => $report->createdBy ? [
                        'id' => $report->createdBy->id,
                        'name' => $report->createdBy->name,
                    ] : null,
                ];
            }),
        ]);
    }

    /**
     * Create a new report.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'conversation_history' => ['required', 'array', 'min:1'],
            'conversation_history.*.role' => ['required', 'string', 'in:user,assistant'],
            'conversation_history.*.content' => ['required', 'string', 'max:10000'],
        ]);

        $householdId = $request->user()->household_id;
        $reportService = ReportService::forHousehold($householdId);

        if (!$reportService->isAvailable()) {
            return response()->json([
                'message' => 'AI is not configured. Please configure an AI provider in Settings.',
            ], 422);
        }

        // Generate the report HTML
        $result = $reportService->generateReport($validated['conversation_history']);

        if (!$result['success']) {
            return response()->json([
                'message' => $result['error'] ?? 'Failed to generate report',
            ], 422);
        }

        // Create the report record
        $report = Report::create([
            'household_id' => $householdId,
            'created_by_user_id' => $request->user()->id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'prompt_used' => $validated['conversation_history'],
        ]);

        // Save the HTML file
        $filePath = $reportService->saveReportFile($result['html'], $report->id);
        $report->update(['file_path' => $filePath]);

        return response()->json([
            'report' => [
                'id' => $report->id,
                'name' => $report->name,
                'description' => $report->description,
                'created_at' => $report->created_at->toISOString(),
                'updated_at' => $report->updated_at->toISOString(),
            ],
        ], 201);
    }

    /**
     * Get a specific report's metadata.
     */
    public function show(Request $request, Report $report): JsonResponse
    {
        // Ensure report belongs to user's household
        if ($report->household_id !== $request->user()->household_id) {
            return response()->json([
                'message' => 'Report not found',
            ], 404);
        }

        return response()->json([
            'report' => [
                'id' => $report->id,
                'name' => $report->name,
                'description' => $report->description,
                'created_at' => $report->created_at->toISOString(),
                'updated_at' => $report->updated_at->toISOString(),
                'created_by' => $report->createdBy ? [
                    'id' => $report->createdBy->id,
                    'name' => $report->createdBy->name,
                ] : null,
            ],
        ]);
    }

    /**
     * Get the HTML content of a report.
     */
    public function view(Request $request, Report $report): JsonResponse
    {
        // Ensure report belongs to user's household
        if ($report->household_id !== $request->user()->household_id) {
            return response()->json([
                'message' => 'Report not found',
            ], 404);
        }

        if (!$report->file_path) {
            return response()->json([
                'message' => 'Report file not found',
            ], 404);
        }

        $reportService = ReportService::forHousehold($report->household_id);
        $html = $reportService->getReportFileContent($report->file_path);

        if (!$html) {
            return response()->json([
                'message' => 'Report file not found',
            ], 404);
        }

        return response($html)->header('Content-Type', 'text/html');
    }

    /**
     * Update a report's metadata.
     */
    public function update(Request $request, Report $report): JsonResponse
    {
        // Ensure report belongs to user's household
        if ($report->household_id !== $request->user()->household_id) {
            return response()->json([
                'message' => 'Report not found',
            ], 404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        $report->update($validated);

        return response()->json([
            'report' => [
                'id' => $report->id,
                'name' => $report->name,
                'description' => $report->description,
                'created_at' => $report->created_at->toISOString(),
                'updated_at' => $report->updated_at->toISOString(),
            ],
        ]);
    }

    /**
     * Delete a report.
     */
    public function destroy(Request $request, Report $report): JsonResponse
    {
        // Ensure report belongs to user's household
        if ($report->household_id !== $request->user()->household_id) {
            return response()->json([
                'message' => 'Report not found',
            ], 404);
        }

        // Delete the file if it exists
        if ($report->file_path) {
            $reportService = ReportService::forHousehold($report->household_id);
            $reportService->deleteReportFile($report->file_path);
        }

        $report->delete();

        return response()->json([
            'message' => 'Report deleted successfully',
        ]);
    }

    /**
     * Regenerate a report with new conversation history.
     */
    public function regenerate(Request $request, Report $report): JsonResponse
    {
        // Ensure report belongs to user's household
        if ($report->household_id !== $request->user()->household_id) {
            return response()->json([
                'message' => 'Report not found',
            ], 404);
        }

        $validated = $request->validate([
            'conversation_history' => ['required', 'array', 'min:1'],
            'conversation_history.*.role' => ['required', 'string', 'in:user,assistant'],
            'conversation_history.*.content' => ['required', 'string', 'max:10000'],
        ]);

        $reportService = ReportService::forHousehold($report->household_id);

        if (!$reportService->isAvailable()) {
            return response()->json([
                'message' => 'AI is not configured. Please configure an AI provider in Settings.',
            ], 422);
        }

        // Generate the new report HTML
        $result = $reportService->generateReport($validated['conversation_history']);

        if (!$result['success']) {
            return response()->json([
                'message' => $result['error'] ?? 'Failed to regenerate report',
            ], 422);
        }

        // Delete old file if it exists
        if ($report->file_path) {
            $reportService->deleteReportFile($report->file_path);
        }

        // Save the new HTML file
        $filePath = $reportService->saveReportFile($result['html'], $report->id);
        
        // Update the report
        $report->update([
            'file_path' => $filePath,
            'prompt_used' => $validated['conversation_history'],
        ]);

        return response()->json([
            'report' => [
                'id' => $report->id,
                'name' => $report->name,
                'description' => $report->description,
                'created_at' => $report->created_at->toISOString(),
                'updated_at' => $report->updated_at->toISOString(),
            ],
        ]);
    }
}
