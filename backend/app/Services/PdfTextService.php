<?php

namespace App\Services;

use App\Models\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Smalot\PdfParser\Parser;

/**
 * Service for extracting text content from PDF files.
 * 
 * Used for AI analysis of product manuals to extract parts lists,
 * maintenance schedules, and other relevant information.
 */
class PdfTextService
{
    protected Parser $parser;
    
    /**
     * Maximum characters to extract from a PDF to stay within AI context limits.
     * Most AI models can handle ~100K tokens, but we limit to ensure good performance.
     */
    protected const MAX_TEXT_LENGTH = 100000;
    
    /**
     * Maximum pages to process to avoid memory issues with large manuals.
     */
    protected const MAX_PAGES = 100;

    public function __construct()
    {
        $this->parser = new Parser();
    }

    /**
     * Extract text from a File model (PDF).
     */
    public function extractFromFile(File $file): ?string
    {
        if (!$this->isPdf($file)) {
            return null;
        }

        try {
            $content = Storage::disk($file->disk)->get($file->path);
            if (!$content) {
                Log::warning("PdfTextService: Could not read file", ['file_id' => $file->id]);
                return null;
            }

            return $this->extractFromContent($content);
        } catch (\Exception $e) {
            Log::error("PdfTextService: Error extracting text from file", [
                'file_id' => $file->id,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Extract text from raw PDF content.
     */
    public function extractFromContent(string $pdfContent): ?string
    {
        try {
            $pdf = $this->parser->parseContent($pdfContent);
            $pages = $pdf->getPages();
            
            $text = '';
            $pageCount = 0;
            
            foreach ($pages as $page) {
                if ($pageCount >= self::MAX_PAGES) {
                    $text .= "\n\n[... Additional pages truncated for processing ...]";
                    break;
                }
                
                $pageText = $page->getText();
                
                // Check if adding this page would exceed our limit
                if (strlen($text) + strlen($pageText) > self::MAX_TEXT_LENGTH) {
                    // Add what we can and truncate
                    $remaining = self::MAX_TEXT_LENGTH - strlen($text);
                    if ($remaining > 100) {
                        $text .= substr($pageText, 0, $remaining);
                    }
                    $text .= "\n\n[... Content truncated for processing ...]";
                    break;
                }
                
                $text .= $pageText . "\n\n";
                $pageCount++;
            }
            
            // Clean up the text
            $text = $this->cleanText($text);
            
            return $text ?: null;
        } catch (\Exception $e) {
            Log::error("PdfTextService: Error parsing PDF content", [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Extract text from multiple File models and combine them.
     * 
     * @param \Illuminate\Support\Collection<File> $files
     * @return array{text: string|null, files_processed: int, files_failed: int}
     */
    public function extractFromFiles($files): array
    {
        $combinedText = '';
        $filesProcessed = 0;
        $filesFailed = 0;
        
        foreach ($files as $file) {
            if (!$this->isPdf($file)) {
                continue;
            }
            
            $text = $this->extractFromFile($file);
            
            if ($text) {
                $displayName = $file->display_name ?? $file->original_name ?? 'Document';
                $combinedText .= "=== {$displayName} ===\n\n";
                $combinedText .= $text;
                $combinedText .= "\n\n";
                $filesProcessed++;
                
                // Check total length
                if (strlen($combinedText) > self::MAX_TEXT_LENGTH) {
                    $combinedText = substr($combinedText, 0, self::MAX_TEXT_LENGTH);
                    $combinedText .= "\n\n[... Additional content truncated ...]";
                    break;
                }
            } else {
                $filesFailed++;
            }
        }
        
        return [
            'text' => $combinedText ?: null,
            'files_processed' => $filesProcessed,
            'files_failed' => $filesFailed,
        ];
    }

    /**
     * Check if a file is a PDF.
     */
    protected function isPdf(File $file): bool
    {
        return $file->mime_type === 'application/pdf' 
            || str_ends_with(strtolower($file->original_name ?? ''), '.pdf');
    }

    /**
     * Clean up extracted text.
     */
    protected function cleanText(string $text): string
    {
        // Remove excessive whitespace
        $text = preg_replace('/[ \t]+/', ' ', $text);
        
        // Normalize line breaks
        $text = preg_replace('/\r\n|\r/', "\n", $text);
        
        // Remove excessive blank lines (more than 2 in a row)
        $text = preg_replace('/\n{4,}/', "\n\n\n", $text);
        
        // Trim
        $text = trim($text);
        
        return $text;
    }

    /**
     * Get a summary of what content is available for an item's manuals.
     */
    public function getManualSummary($files): array
    {
        $pdfCount = 0;
        $totalSize = 0;
        $fileNames = [];
        
        foreach ($files as $file) {
            if ($this->isPdf($file)) {
                $pdfCount++;
                $totalSize += $file->size ?? 0;
                $fileNames[] = $file->display_name ?? $file->original_name ?? 'Unknown';
            }
        }
        
        return [
            'pdf_count' => $pdfCount,
            'total_size_bytes' => $totalSize,
            'file_names' => $fileNames,
        ];
    }
}
