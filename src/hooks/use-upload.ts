'use client';

import { useState, useCallback, useRef } from 'react';
import { UploadedImage, ImageBatch, ConsolidatedReport, BatchProcessingStatus } from '@/lib/types';
import { ImageProcessor } from '@/lib/image-processing';
import { RadiologyAPIClient } from '@/lib/api-client';

interface UseUploadState {
  images: UploadedImage[];
  batches: ImageBatch[];
  isProcessing: boolean;
  processingStatus: BatchProcessingStatus;
  report: ConsolidatedReport | null;
  error: string | null;
}

interface UseUploadActions {
  uploadImages: (files: FileList | File[]) => Promise<void>;
  removeImage: (imageId: string) => void;
  clearAllImages: () => void;
  startAnalysis: (systemPrompt?: string) => Promise<void>;
  resetAnalysis: () => void;
}

export function useUpload(): UseUploadState & UseUploadActions {
  const [state, setState] = useState<UseUploadState>({
    images: [],
    batches: [],
    isProcessing: false,
    processingStatus: {
      totalBatches: 0,
      completedBatches: 0,
      failedBatches: 0,
      overallProgress: 0
    },
    report: null,
    error: null
  });

  const processingRef = useRef<boolean>(false);

  const uploadImages = useCallback(async (files: FileList | File[]) => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const newImages = await ImageProcessor.processUploadedFiles(files);
      
      setState(prev => {
        const totalImages = prev.images.length + newImages.length;
        
        // Check total image limit
        if (totalImages > 200) {
          return {
            ...prev,
            error: `Cannot upload more than 200 images. Current: ${prev.images.length}, Attempting to add: ${newImages.length}`
          };
        }

        const allImages = [...prev.images, ...newImages];
        const newBatches = ImageProcessor.createBatches(allImages);

        return {
          ...prev,
          images: allImages,
          batches: newBatches,
          processingStatus: {
            ...prev.processingStatus,
            totalBatches: newBatches.length
          }
        };
      });
    } catch (error) {
      console.error('Upload error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to upload images'
      }));
    }
  }, []);

  const removeImage = useCallback((imageId: string) => {
    setState(prev => {
      // Clean up preview URL
      const imageToRemove = prev.images.find(img => img.id === imageId);
      if (imageToRemove?.preview && imageToRemove.preview.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove.preview);
      }

      const remainingImages = prev.images.filter(img => img.id !== imageId);
      const newBatches = ImageProcessor.createBatches(remainingImages);

      return {
        ...prev,
        images: remainingImages,
        batches: newBatches,
        processingStatus: {
          ...prev.processingStatus,
          totalBatches: newBatches.length
        },
        error: null
      };
    });
  }, []);

  const clearAllImages = useCallback(() => {
    setState(prev => {
      // Clean up all preview URLs
      ImageProcessor.cleanupPreviewURLs(prev.images);

      return {
        images: [],
        batches: [],
        isProcessing: false,
        processingStatus: {
          totalBatches: 0,
          completedBatches: 0,
          failedBatches: 0,
          overallProgress: 0
        },
        report: null,
        error: null
      };
    });
  }, []);

  const startAnalysis = useCallback(async (systemPrompt?: string) => {
    if (processingRef.current) return;
    
    processingRef.current = true;
    
    try {
      setState(prev => ({
        ...prev,
        isProcessing: true,
        error: null,
        report: null,
        processingStatus: {
          totalBatches: prev.batches.length,
          completedBatches: 0,
          failedBatches: 0,
          overallProgress: 0
        }
      }));

      const startTime = Date.now();
      const processedBatches: ImageBatch[] = [];
      let completedCount = 0;
      let failedCount = 0;

      // Process batches in parallel (with controlled concurrency)
      const maxConcurrent = 3; // Limit concurrent requests
      const batchQueue = [...state.batches];
      const activeBatches: Promise<void>[] = [];

      const processBatch = async (batch: ImageBatch): Promise<void> => {
        try {
          setState(prev => ({
            ...prev,
            processingStatus: {
              ...prev.processingStatus,
              currentBatch: batch.id
            }
          }));

          // Update batch status
          batch.status = 'processing';
          batch.startTime = Date.now();

          // Prepare images for API
          const apiImages = await ImageProcessor.prepareBatchForAPI(batch);

          // Call Claude API
          const response = await RadiologyAPIClient.analyzeImageBatch({
            images: apiImages,
            systemPrompt: systemPrompt || '',
            batchId: batch.id
          });

          if (response.success && response.result) {
            batch.status = 'completed';
            batch.result = response.result;
            batch.endTime = Date.now();
            completedCount++;
          } else {
            batch.status = 'error';
            batch.error = response.error?.message || 'Analysis failed';
            batch.endTime = Date.now();
            failedCount++;
          }

          processedBatches.push(batch);

          // Update progress
          const totalProcessed = completedCount + failedCount;
          const progress = Math.round((totalProcessed / state.batches.length) * 100);

          setState(prev => ({
            ...prev,
            batches: prev.batches.map(b => b.id === batch.id ? batch : b),
            processingStatus: {
              ...prev.processingStatus,
              completedBatches: completedCount,
              failedBatches: failedCount,
              overallProgress: progress
            }
          }));

        } catch (error) {
          console.error(`Batch processing failed for ${batch.id}:`, error);
          batch.status = 'error';
          batch.error = error instanceof Error ? error.message : 'Unknown error';
          batch.endTime = Date.now();
          failedCount++;
          processedBatches.push(batch);
        }
      };

      // Process batches with controlled concurrency
      while (batchQueue.length > 0 || activeBatches.length > 0) {
        // Start new batches up to the concurrency limit
        while (batchQueue.length > 0 && activeBatches.length < maxConcurrent) {
          const batch = batchQueue.shift()!;
          const batchPromise = processBatch(batch);
          activeBatches.push(batchPromise);
        }

        // Wait for at least one batch to complete
        if (activeBatches.length > 0) {
          await Promise.race(activeBatches);
          
          // Remove completed promises
          for (let i = activeBatches.length - 1; i >= 0; i--) {
            const promise = activeBatches[i];
            // Check if promise is resolved/rejected
            try {
              await Promise.race([promise, new Promise((_, reject) => setTimeout(reject, 0))]);
              activeBatches.splice(i, 1);
            } catch {
              // Promise is still pending
            }
          }
        }
      }

      // Wait for all remaining batches to complete
      if (activeBatches.length > 0) {
        await Promise.all(activeBatches.map(p => p.catch(e => e)));
      }

      // Generate consolidated report
      const endTime = Date.now();
      const consolidatedReport = generateConsolidatedReport(
        processedBatches,
        state.images.length,
        startTime,
        endTime
      );

      setState(prev => ({
        ...prev,
        isProcessing: false,
        report: consolidatedReport,
        processingStatus: {
          ...prev.processingStatus,
          currentBatch: undefined,
          overallProgress: 100
        }
      }));

    } catch (error) {
      console.error('Analysis error:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      }));
    } finally {
      processingRef.current = false;
    }
  }, [state.batches, state.images.length]);

  const resetAnalysis = useCallback(() => {
    setState(prev => ({
      ...prev,
      report: null,
      error: null,
      processingStatus: {
        totalBatches: prev.batches.length,
        completedBatches: 0,
        failedBatches: 0,
        overallProgress: 0
      },
      batches: prev.batches.map(batch => ({
        ...batch,
        status: 'pending',
        result: undefined,
        error: undefined,
        startTime: undefined,
        endTime: undefined
      }))
    }));
  }, []);

  return {
    ...state,
    uploadImages,
    removeImage,
    clearAllImages,
    startAnalysis,
    resetAnalysis
  };
}

// Helper function to generate consolidated report
function generateConsolidatedReport(
  batches: ImageBatch[],
  totalImages: number,
  startTime: number,
  endTime: number
): ConsolidatedReport {
  const completedBatches = batches.filter(b => b.status === 'completed');
  const failedBatches = batches.filter(b => b.status === 'error');

  const allFindings = completedBatches
    .map(b => b.result?.findings)
    .filter(Boolean) as string[];

  const allRecommendations = completedBatches
    .map(b => b.result?.recommendations)
    .filter(Boolean) as string[];

  const overallFindings = allFindings.length > 0 
    ? `Analysis of ${totalImages} medical images across ${completedBatches.length} batches:\n\n${allFindings.join('\n\n--- BATCH SEPARATOR ---\n\n')}`
    : 'No findings available due to processing errors.';

  return {
    id: `report-${Date.now()}`,
    totalImages,
    totalBatches: batches.length,
    completedBatches: completedBatches.length,
    failedBatches: failedBatches.length,
    overallFindings,
    detailedFindings: completedBatches.map(b => b.result!),
    recommendations: allRecommendations,
    confidence: completedBatches.length > 0 ? 'Standard diagnostic analysis' : 'Limited due to processing errors',
    processingStartTime: startTime,
    processingEndTime: endTime,
    status: failedBatches.length === batches.length ? 'error' : 'completed'
  };
}