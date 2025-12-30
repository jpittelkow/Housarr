<?php

use App\Services\StorageService;

describe('StorageService', function () {
    describe('path generation', function () {
        it('generates household-scoped file path', function () {
            $service = new StorageService();
            
            $path = $service->getFilePath(1, 'item', 'test.jpg');
            
            expect($path)->toContain('households/1')
                ->toContain('items')
                ->toContain('test.jpg');
        });

        it('generates different paths for different types', function () {
            $service = new StorageService();
            
            $itemPath = $service->getFilePath(1, 'item', 'file.jpg');
            $partPath = $service->getFilePath(1, 'part', 'file.jpg');
            
            expect($itemPath)->toContain('items');
            expect($partPath)->toContain('parts');
        });

        it('sanitizes filenames', function () {
            $service = new StorageService();
            
            $path = $service->getFilePath(1, 'item', 'my file (1).jpg');
            
            // Should not have spaces or special chars that could cause issues
            expect($path)->not->toContain(' ')
                ->toContain('.jpg');
        });
    });

    describe('URL generation', function () {
        it('generates public URL for local storage', function () {
            config(['filesystems.default' => 'local']);
            
            $service = new StorageService();
            $url = $service->getPublicUrl('households/1/items/test.jpg');
            
            expect($url)->toContain('/storage/')
                ->toContain('test.jpg');
        });
    });

    describe('file type validation', function () {
        it('validates image extensions', function () {
            $service = new StorageService();
            
            expect($service->isValidImageExtension('jpg'))->toBeTrue();
            expect($service->isValidImageExtension('jpeg'))->toBeTrue();
            expect($service->isValidImageExtension('png'))->toBeTrue();
            expect($service->isValidImageExtension('gif'))->toBeTrue();
            expect($service->isValidImageExtension('webp'))->toBeTrue();
            expect($service->isValidImageExtension('exe'))->toBeFalse();
        });

        it('validates document extensions', function () {
            $service = new StorageService();
            
            expect($service->isValidDocumentExtension('pdf'))->toBeTrue();
            expect($service->isValidDocumentExtension('doc'))->toBeTrue();
            expect($service->isValidDocumentExtension('docx'))->toBeTrue();
            expect($service->isValidDocumentExtension('exe'))->toBeFalse();
        });
    });

    describe('household storage', function () {
        it('keeps files isolated by household', function () {
            $service = new StorageService();
            
            $path1 = $service->getFilePath(1, 'item', 'test.jpg');
            $path2 = $service->getFilePath(2, 'item', 'test.jpg');
            
            expect($path1)->toContain('households/1');
            expect($path2)->toContain('households/2');
            expect($path1)->not->toBe($path2);
        });
    });
});
