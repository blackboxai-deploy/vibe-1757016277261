import { NextRequest, NextResponse } from 'next/server';
import { RadiologyAPIClient } from '@/lib/api-client';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract system prompt
    const systemPrompt = formData.get('systemPrompt') as string || DEFAULT_SYSTEM_PROMPT;
    const batchId = formData.get('batchId') as string || `batch-${Date.now()}`;
    
    // Extract and process images
    const images: { name: string; data: string; type: string }[] = [];
    const imageFiles: File[] = [];
    
    // Collect all image files
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image-') && value instanceof File) {
        imageFiles.push(value);
      }
    }

    // Validate batch size
    if (imageFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_IMAGES', message: 'No images provided' } },
        { status: 400 }
      );
    }

    if (imageFiles.length > 20) {
      return NextResponse.json(
        { success: false, error: { code: 'BATCH_TOO_LARGE', message: 'Maximum 20 images per batch' } },
        { status: 400 }
      );
    }

    // Convert images to base64
    for (const file of imageFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const base64 = btoa(String.fromCharCode(...uint8Array));
        
        // Validate image
        if (!RadiologyAPIClient.validateImageData(base64, file.type)) {
          return NextResponse.json(
            { success: false, error: { code: 'INVALID_IMAGE', message: `Invalid image: ${file.name}` } },
            { status: 400 }
          );
        }

        images.push({
          name: file.name,
          data: base64,
          type: file.type
        });
      } catch (error) {
        console.error(`Failed to process image ${file.name}:`, error);
        return NextResponse.json(
          { success: false, error: { code: 'IMAGE_PROCESSING_FAILED', message: `Failed to process ${file.name}` } },
          { status: 500 }
        );
      }
    }

    // Call the analysis API
    const analysisRequest = {
      images,
      systemPrompt,
      batchId
    };

    console.log(`Starting analysis for batch ${batchId} with ${images.length} images`);
    
    const result = await RadiologyAPIClient.analyzeImageBatch(analysisRequest);
    
    if (result.success) {
      console.log(`Analysis completed for batch ${batchId}`);
      return NextResponse.json(result);
    } else {
      console.error(`Analysis failed for batch ${batchId}:`, result.error);
      return NextResponse.json(
        result,
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: error instanceof Error ? error.message : 'Internal server error' 
        } 
      },
      { status: 500 }
    );
  }
}

// Handle preflight OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Also support GET for health check
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'radiology-analysis-api',
    timestamp: new Date().toISOString(),
    limits: {
      maxImagesPerBatch: 20,
      maxFileSize: '50MB',
      supportedFormats: ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp', 'application/dicom']
    }
  });
}