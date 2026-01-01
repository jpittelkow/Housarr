<?php

use App\Models\Household;
use App\Services\ReportService;
use App\Models\Setting;

beforeEach(function () {
    $this->household = Household::factory()->create();
    $this->service = ReportService::forHousehold($this->household->id);
});

describe('ReportService', function () {
    it('reports unavailable when AI is not configured', function () {
        expect($this->service->isAvailable())->toBeFalse();
    });

    it('reports available when AI is configured', function () {
        Setting::set('ai_provider', 'claude', $this->household->id);
        Setting::set('anthropic_api_key', 'test-key', $this->household->id);

        expect($this->service->isAvailable())->toBeTrue();
    });

    it('returns available data types', function () {
        $dataTypes = $this->service->getAvailableDataTypes();

        expect($dataTypes)->toBeArray()
            ->toHaveKeys(['items', 'reminders', 'todos', 'maintenance_logs', 'vendors', 'locations', 'dashboard']);
    });

    it('can save and retrieve report file', function () {
        $html = '<!DOCTYPE html><html><body>Test Report</body></html>';
        $reportId = 1;
        
        $filePath = $this->service->saveReportFile($html, $reportId);
        
        expect($filePath)->toBeString();
        expect($filePath)->toContain("reports/{$this->household->id}/{$reportId}.html");

        $content = $this->service->getReportFileContent($filePath);
        expect($content)->toBe($html);
    });

    it('can delete report file', function () {
        $html = '<!DOCTYPE html><html><body>Test Report</body></html>';
        $reportId = 1;
        
        $filePath = $this->service->saveReportFile($html, $reportId);
        $deleted = $this->service->deleteReportFile($filePath);
        
        expect($deleted)->toBeTrue();
        
        $content = $this->service->getReportFileContent($filePath);
        expect($content)->toBeNull();
    });
});
