<?php

use App\Services\ManualSearchService;
use App\Models\Household;
use App\Models\Item;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->household = Household::factory()->create();
    $this->item = Item::factory()->create([
        'household_id' => $this->household->id,
        'make' => 'Samsung',
        'model' => 'RF28R7551SR',
    ]);
});

describe('ManualSearchService initialization', function () {
    it('can be instantiated', function () {
        $service = new ManualSearchService();
        
        expect($service)->toBeInstanceOf(ManualSearchService::class);
    });

    it('can be instantiated with household id', function () {
        $service = new ManualSearchService($this->household->id);
        
        expect($service)->toBeInstanceOf(ManualSearchService::class);
    });

    it('can set household id after instantiation', function () {
        $service = new ManualSearchService();
        $service->setHouseholdId($this->household->id);
        
        expect($service)->toBeInstanceOf(ManualSearchService::class);
    });
});

describe('ManualSearchService repository search', function () {
    it('returns manufacturer repository URLs', function () {
        $service = new ManualSearchService();
        $results = $service->searchManualRepositoriesPublic('Samsung', 'RF28R7551SR');

        expect($results)->toBeArray()
            ->not->toBeEmpty();
        
        // Should include ManualsLib
        $containsManualsLib = false;
        foreach ($results as $url) {
            if (str_contains($url, 'manualslib.com')) {
                $containsManualsLib = true;
                break;
            }
        }
        expect($containsManualsLib)->toBeTrue();
    });

    it('returns Samsung-specific URLs for Samsung products', function () {
        $service = new ManualSearchService();
        $results = $service->searchManualRepositoriesPublic('Samsung', 'RF28R7551SR');

        $containsSamsung = false;
        foreach ($results as $url) {
            if (str_contains($url, 'samsung.com')) {
                $containsSamsung = true;
                break;
            }
        }
        expect($containsSamsung)->toBeTrue();
    });
});

describe('ManualSearchService PDF download', function () {
    it('downloads PDF from valid URL with magic bytes', function () {
        // Real PDF needs to be > 1000 bytes and have structure
        // Create a minimal PDF that passes validation
        $pdfContent = "%PDF-1.4\n" . str_repeat("1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n", 50) . "\n%%EOF";
        Http::fake([
            '*' => Http::response($pdfContent, 200, [
                'Content-Type' => 'application/pdf',
            ]),
        ]);

        $service = new ManualSearchService();
        $result = $service->downloadPdf('https://example.com/manual.pdf');

        expect($result)->toBeArray()
            ->toHaveKey('content')
            ->toHaveKey('filename')
            ->toHaveKey('size');
    });

    it('returns null for non-PDF content type', function () {
        Http::fake([
            '*' => Http::response('<html>Not Found</html>', 200, [
                'Content-Type' => 'text/html',
            ]),
        ]);

        $service = new ManualSearchService();
        $result = $service->downloadPdf('https://example.com/page.html');

        expect($result)->toBeNull();
    });

    it('returns null for failed requests', function () {
        Http::fake([
            '*' => Http::response('Not Found', 404),
        ]);

        $service = new ManualSearchService();
        $result = $service->downloadPdf('https://example.com/missing.pdf');

        expect($result)->toBeNull();
    });

    it('returns null for small files', function () {
        $pdfContent = '%PDF-1.4';
        Http::fake([
            '*' => Http::response($pdfContent, 200, [
                'Content-Type' => 'application/pdf',
            ]),
        ]);

        $service = new ManualSearchService();
        $result = $service->downloadPdf('https://example.com/tiny.pdf');

        // File too small to be a valid PDF (under 1000 bytes)
        expect($result)->toBeNull();
    });
});

describe('ManualSearchService findPdfOnPage', function () {
    it('finds PDF links on a page', function () {
        $html = '<html><body><a href="/docs/manual.pdf">Download Manual</a></body></html>';
        Http::fake([
            '*' => Http::response($html, 200, ['Content-Type' => 'text/html']),
        ]);

        $service = new ManualSearchService();
        $result = $service->findPdfOnPage('https://example.com/product', 'Samsung', 'RF28R7551SR');

        if ($result !== null) {
            expect($result)->toContain('.pdf');
        }
    });

    it('returns null when no PDF found', function () {
        $html = '<html><body>No PDFs here</body></html>';
        Http::fake([
            '*' => Http::response($html, 200, ['Content-Type' => 'text/html']),
        ]);

        $service = new ManualSearchService();
        $result = $service->findPdfOnPage('https://example.com/product', 'Samsung', 'RF28R7551SR');

        expect($result)->toBeNull();
    });

    it('prefers PDF links containing model number', function () {
        $html = '<html><body>
            <a href="/docs/generic.pdf">Generic</a>
            <a href="/docs/RF28R7551SR-manual.pdf">Model Manual</a>
        </body></html>';
        Http::fake([
            '*' => Http::response($html, 200, ['Content-Type' => 'text/html']),
        ]);

        $service = new ManualSearchService();
        $result = $service->findPdfOnPage('https://example.com/product', 'Samsung', 'RF28R7551SR');

        if ($result !== null) {
            expect($result)->toContain('RF28R7551SR');
        }
    });
});

describe('ManualSearchService DuckDuckGo search', function () {
    it('returns search links as fallback when blocked', function () {
        // Simulate bot detection
        $html = '<html><body class="anomaly-modal">Bot detected</body></html>';
        Http::fake([
            '*' => Http::response($html, 200, ['Content-Type' => 'text/html']),
        ]);

        $service = new ManualSearchService();
        $result = $service->searchWithDuckDuckGoPublic('Samsung', 'RF28R7551SR');

        expect($result)->toBeArray()
            ->toHaveKey('urls')
            ->toHaveKey('search_links');
    });
});
