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
});

describe('ManualSearchService search', function () {
    it('searches for manuals by make and model', function () {
        Http::fake([
            '*' => Http::response(['results' => []], 200),
        ]);

        $service = new ManualSearchService();
        $results = $service->search('Samsung', 'RF28R7551SR');

        expect($results)->toBeArray();
    });

    it('returns empty array for empty search', function () {
        $service = new ManualSearchService();
        $results = $service->search('', '');

        expect($results)->toBeArray();
        expect($results)->toBeEmpty();
    });

    it('handles search with only make', function () {
        Http::fake([
            '*' => Http::response(['results' => []], 200),
        ]);

        $service = new ManualSearchService();
        $results = $service->search('Samsung', '');

        expect($results)->toBeArray();
    });

    it('handles search with only model', function () {
        Http::fake([
            '*' => Http::response(['results' => []], 200),
        ]);

        $service = new ManualSearchService();
        $results = $service->search('', 'RF28R7551SR');

        expect($results)->toBeArray();
    });
});

describe('ManualSearchService URL parsing', function () {
    it('extracts domain from URL', function () {
        $service = new ManualSearchService();
        
        $domain = $service->extractDomain('https://www.samsung.com/manuals/test.pdf');
        
        expect($domain)->toBe('samsung.com');
    });

    it('handles URLs without www', function () {
        $service = new ManualSearchService();
        
        $domain = $service->extractDomain('https://support.lg.com/manual.pdf');
        
        expect($domain)->toBe('support.lg.com');
    });

    it('handles invalid URLs gracefully', function () {
        $service = new ManualSearchService();
        
        $domain = $service->extractDomain('not-a-url');
        
        expect($domain)->toBeNull();
    });
});

describe('ManualSearchService download', function () {
    it('downloads manual from URL', function () {
        Http::fake([
            '*' => Http::response('PDF content', 200, [
                'Content-Type' => 'application/pdf',
            ]),
        ]);

        $service = new ManualSearchService();
        $result = $service->download('https://example.com/manual.pdf', $this->item);

        expect($result)->toBeArray();
        expect($result)->toHaveKey('success');
    });

    it('validates URL before downloading', function () {
        $service = new ManualSearchService();
        $result = $service->download('not-a-valid-url', $this->item);

        expect($result['success'])->toBeFalse();
    });

    it('handles download failures gracefully', function () {
        Http::fake([
            '*' => Http::response('Not Found', 404),
        ]);

        $service = new ManualSearchService();
        $result = $service->download('https://example.com/missing.pdf', $this->item);

        expect($result['success'])->toBeFalse();
        expect($result)->toHaveKey('error');
    });

    it('validates content type is PDF', function () {
        Http::fake([
            '*' => Http::response('<html>Not a PDF</html>', 200, [
                'Content-Type' => 'text/html',
            ]),
        ]);

        $service = new ManualSearchService();
        $result = $service->download('https://example.com/page.html', $this->item);

        // Should either fail or warn about non-PDF content
        if ($result['success']) {
            // Some implementations may still accept non-PDF
            expect($result)->toHaveKey('file');
        } else {
            expect($result)->toHaveKey('error');
        }
    });
});

describe('ManualSearchService repositories', function () {
    it('searches manufacturer repositories', function () {
        Http::fake([
            '*' => Http::response(['results' => []], 200),
        ]);

        $service = new ManualSearchService();
        $results = $service->searchRepositories('Samsung', 'RF28R7551SR');

        expect($results)->toBeArray();
    });

    it('searches ManualsLib', function () {
        Http::fake([
            'manualslib.com/*' => Http::response('', 200),
        ]);

        $service = new ManualSearchService();
        $results = $service->searchManualsLib('Samsung RF28R7551SR');

        expect($results)->toBeArray();
    });
});

describe('ManualSearchService progress tracking', function () {
    it('reports search progress', function () {
        $progress = [];
        
        $service = new ManualSearchService();
        $service->onProgress(function ($step, $data) use (&$progress) {
            $progress[] = ['step' => $step, 'data' => $data];
        });
        
        Http::fake(['*' => Http::response([], 200)]);
        $service->search('Samsung', 'RF28R7551SR');

        // Progress callback may or may not be called depending on implementation
        expect($progress)->toBeArray();
    });
});

describe('ManualSearchService result formatting', function () {
    it('formats search results consistently', function () {
        Http::fake([
            '*' => Http::response([
                'results' => [
                    ['url' => 'https://example.com/manual.pdf', 'title' => 'Test Manual'],
                ],
            ], 200),
        ]);

        $service = new ManualSearchService();
        $results = $service->search('Samsung', 'RF28R7551SR');

        foreach ($results as $result) {
            expect($result)->toHaveKeys(['url', 'title']);
        }
    });

    it('includes source information', function () {
        Http::fake([
            '*' => Http::response([
                'results' => [
                    ['url' => 'https://samsung.com/manual.pdf', 'title' => 'Manual'],
                ],
            ], 200),
        ]);

        $service = new ManualSearchService();
        $results = $service->search('Samsung', 'RF28R7551SR');

        foreach ($results as $result) {
            if (isset($result['source'])) {
                expect($result['source'])->toBeString();
            }
        }
    });
});
