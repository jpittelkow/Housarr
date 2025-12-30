<?php

use App\Models\User;
use App\Models\Household;
use App\Models\Item;
use App\Models\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    
    $this->household = Household::factory()->create();
    $this->user = User::factory()->create([
        'household_id' => $this->household->id,
    ]);
    $this->item = Item::factory()->create([
        'household_id' => $this->household->id,
    ]);
    $this->actingAs($this->user);
});

describe('files upload', function () {
    it('uploads a file for an item', function () {
        $file = UploadedFile::fake()->image('photo.jpg');

        $response = $this->postJson('/api/files', [
            'file' => $file,
            'fileable_type' => 'item',
            'fileable_id' => $this->item->id,
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['file' => ['id', 'name', 'mime_type', 'url']]);

        expect(File::count())->toBe(1);
    });

    it('validates file is required', function () {
        $response = $this->postJson('/api/files', [
            'fileable_type' => 'item',
            'fileable_id' => $this->item->id,
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['file']);
    });

    it('validates file type', function () {
        $file = UploadedFile::fake()->create('document.exe', 100);

        $response = $this->postJson('/api/files', [
            'file' => $file,
            'fileable_type' => 'item',
            'fileable_id' => $this->item->id,
        ]);

        $response->assertUnprocessable();
    });

    it('allows PDF uploads', function () {
        $file = UploadedFile::fake()->create('manual.pdf', 500);

        $response = $this->postJson('/api/files', [
            'file' => $file,
            'fileable_type' => 'item',
            'fileable_id' => $this->item->id,
        ]);

        $response->assertCreated();
    });

    it('prevents uploading to other household items', function () {
        $otherHousehold = Household::factory()->create();
        $otherItem = Item::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $file = UploadedFile::fake()->image('photo.jpg');

        $response = $this->postJson('/api/files', [
            'file' => $file,
            'fileable_type' => 'item',
            'fileable_id' => $otherItem->id,
        ]);

        $response->assertForbidden();
    });

    it('can set as featured image', function () {
        $file = UploadedFile::fake()->image('photo.jpg');

        $response = $this->postJson('/api/files', [
            'file' => $file,
            'fileable_type' => 'item',
            'fileable_id' => $this->item->id,
            'is_featured' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('file.is_featured', true);
    });
});

describe('files download', function () {
    it('downloads a file', function () {
        $uploadedFile = UploadedFile::fake()->image('photo.jpg');
        
        $file = File::factory()->create([
            'fileable_type' => Item::class,
            'fileable_id' => $this->item->id,
            'path' => 'test/photo.jpg',
            'disk' => 'local',
        ]);
        
        Storage::disk('local')->put('test/photo.jpg', 'test content');

        $response = $this->get("/api/files/{$file->id}/download");

        $response->assertOk();
    });

    it('prevents downloading files from other households', function () {
        $otherHousehold = Household::factory()->create();
        $otherItem = Item::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);
        
        $file = File::factory()->create([
            'fileable_type' => Item::class,
            'fileable_id' => $otherItem->id,
        ]);

        $response = $this->get("/api/files/{$file->id}/download");

        $response->assertForbidden();
    });
});

describe('files update', function () {
    it('updates file display name', function () {
        $file = File::factory()->create([
            'fileable_type' => Item::class,
            'fileable_id' => $this->item->id,
            'display_name' => 'Old Name',
        ]);

        $response = $this->putJson("/api/files/{$file->id}", [
            'display_name' => 'New Name',
        ]);

        $response->assertOk()
            ->assertJsonPath('file.display_name', 'New Name');
    });

    it('sets featured status', function () {
        $file = File::factory()->create([
            'fileable_type' => Item::class,
            'fileable_id' => $this->item->id,
            'is_featured' => false,
        ]);

        $response = $this->putJson("/api/files/{$file->id}", [
            'is_featured' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('file.is_featured', true);
    });

    it('clears other featured when setting new featured', function () {
        $oldFeatured = File::factory()->create([
            'fileable_type' => Item::class,
            'fileable_id' => $this->item->id,
            'is_featured' => true,
            'mime_type' => 'image/jpeg',
        ]);
        
        $newFeatured = File::factory()->create([
            'fileable_type' => Item::class,
            'fileable_id' => $this->item->id,
            'is_featured' => false,
            'mime_type' => 'image/jpeg',
        ]);

        $this->putJson("/api/files/{$newFeatured->id}", [
            'is_featured' => true,
        ]);

        $oldFeatured->refresh();
        expect($oldFeatured->is_featured)->toBeFalse();
    });
});

describe('files destroy', function () {
    it('deletes a file', function () {
        $file = File::factory()->create([
            'fileable_type' => Item::class,
            'fileable_id' => $this->item->id,
            'path' => 'test/photo.jpg',
        ]);
        
        Storage::disk('local')->put('test/photo.jpg', 'test content');

        $response = $this->deleteJson("/api/files/{$file->id}");

        $response->assertNoContent();
        expect(File::find($file->id))->toBeNull();
    });

    it('prevents deleting files from other households', function () {
        $otherHousehold = Household::factory()->create();
        $otherItem = Item::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);
        
        $file = File::factory()->create([
            'fileable_type' => Item::class,
            'fileable_id' => $otherItem->id,
        ]);

        $response = $this->deleteJson("/api/files/{$file->id}");

        $response->assertForbidden();
    });
});
