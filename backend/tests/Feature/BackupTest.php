<?php

use App\Models\User;
use App\Models\Household;
use App\Models\Item;
use App\Models\Category;
use App\Models\Location;
use App\Models\Vendor;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    
    $this->household = Household::factory()->create();
    $this->user = User::factory()->create([
        'household_id' => $this->household->id,
        'role' => 'admin',
    ]);
    $this->actingAs($this->user);
});

describe('backup export', function () {
    it('exports household data as JSON', function () {
        Category::factory()->count(2)->create([
            'household_id' => $this->household->id,
        ]);
        Item::factory()->count(3)->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->getJson('/api/backup/export');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'household',
                    'categories',
                    'locations',
                    'vendors',
                    'items',
                ],
            ]);
    });

    it('exports all categories', function () {
        Category::factory()->count(3)->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->getJson('/api/backup/export');

        $response->assertOk()
            ->assertJsonCount(3, 'data.categories');
    });

    it('does not include other household data', function () {
        $otherHousehold = Household::factory()->create();
        Category::factory()->create(['household_id' => $otherHousehold->id]);
        Category::factory()->create(['household_id' => $this->household->id]);

        $response = $this->getJson('/api/backup/export');

        $response->assertOk()
            ->assertJsonCount(1, 'data.categories');
    });

    it('requires admin role', function () {
        $memberUser = User::factory()->create([
            'household_id' => $this->household->id,
            'role' => 'member',
        ]);
        $this->actingAs($memberUser);

        $response = $this->getJson('/api/backup/export');

        $response->assertForbidden();
    });
});

describe('backup export with files', function () {
    it('exports as ZIP with files', function () {
        Item::factory()->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->get('/api/backup/export-with-files');

        $response->assertOk()
            ->assertHeader('content-type', 'application/zip');
    });

    it('requires admin role for ZIP export', function () {
        $memberUser = User::factory()->create([
            'household_id' => $this->household->id,
            'role' => 'member',
        ]);
        $this->actingAs($memberUser);

        $response = $this->get('/api/backup/export-with-files');

        $response->assertForbidden();
    });
});

describe('backup import', function () {
    it('imports household data from JSON', function () {
        $exportData = [
            'household' => ['name' => 'Test Household'],
            'categories' => [
                ['id' => 1, 'name' => 'Imported Category', 'color' => '#FF0000'],
            ],
            'locations' => [],
            'vendors' => [],
            'items' => [],
            'reminders' => [],
            'todos' => [],
            'parts' => [],
            'maintenance_logs' => [],
        ];

        $response = $this->postJson('/api/backup/import', [
            'data' => $exportData,
        ]);

        $response->assertOk();
        expect(Category::where('name', 'Imported Category')->exists())->toBeTrue();
    });

    it('clears existing data before import', function () {
        Category::factory()->create([
            'household_id' => $this->household->id,
            'name' => 'Existing Category',
        ]);

        $exportData = [
            'household' => ['name' => 'Test Household'],
            'categories' => [
                ['id' => 1, 'name' => 'New Category'],
            ],
            'locations' => [],
            'vendors' => [],
            'items' => [],
            'reminders' => [],
            'todos' => [],
            'parts' => [],
            'maintenance_logs' => [],
        ];

        $this->postJson('/api/backup/import', ['data' => $exportData]);

        expect(Category::where('name', 'Existing Category')->exists())->toBeFalse();
        expect(Category::where('name', 'New Category')->exists())->toBeTrue();
    });

    it('validates import data structure', function () {
        $response = $this->postJson('/api/backup/import', [
            'data' => 'invalid',
        ]);

        $response->assertUnprocessable();
    });

    it('requires admin role', function () {
        $memberUser = User::factory()->create([
            'household_id' => $this->household->id,
            'role' => 'member',
        ]);
        $this->actingAs($memberUser);

        $response = $this->postJson('/api/backup/import', [
            'data' => [],
        ]);

        $response->assertForbidden();
    });
});

describe('backup import ZIP', function () {
    it('accepts ZIP file upload', function () {
        // Create a minimal valid ZIP file
        $zipPath = storage_path('app/test-backup.zip');
        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE);
        $zip->addFromString('data.json', json_encode([
            'household' => ['name' => 'Test'],
            'categories' => [],
            'locations' => [],
            'vendors' => [],
            'items' => [],
            'reminders' => [],
            'todos' => [],
            'parts' => [],
            'maintenance_logs' => [],
        ]));
        $zip->close();

        $file = new UploadedFile($zipPath, 'backup.zip', 'application/zip', null, true);

        $response = $this->post('/api/backup/import-with-files', [
            'file' => $file,
        ]);

        $response->assertOk();
        
        // Cleanup
        @unlink($zipPath);
    });

    it('validates ZIP contains data.json', function () {
        $zipPath = storage_path('app/invalid-backup.zip');
        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE);
        $zip->addFromString('random.txt', 'not valid');
        $zip->close();

        $file = new UploadedFile($zipPath, 'backup.zip', 'application/zip', null, true);

        $response = $this->post('/api/backup/import-with-files', [
            'file' => $file,
        ]);

        $response->assertStatus(422);
        
        // Cleanup
        @unlink($zipPath);
    });
});
