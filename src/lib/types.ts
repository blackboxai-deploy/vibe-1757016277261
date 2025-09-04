// Core types for the radiology diagnostic system

export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  size: number;
  type: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface ImageBatch {
  id: string;
  images: UploadedImage[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: DiagnosticResult;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface DiagnosticResult {
  batchId: string;
  imageCount: number;
  findings: string;
  recommendations: string;
  confidence: string;
  technicalNotes?: string;
  processingTime: number;
}

export interface ConsolidatedReport {
  id: string;
  totalImages: number;
  totalBatches: number;
  completedBatches: number;
  failedBatches: number;
  overallFindings: string;
  detailedFindings: DiagnosticResult[];
  recommendations: string[];
  confidence: string;
  processingStartTime: number;
  processingEndTime?: number;
  status: 'processing' | 'completed' | 'error';
}

export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UploadConfig {
  maxImages: number;
  maxFileSize: number; // in bytes
  allowedTypes: string[];
  batchSize: number;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
}

export interface AnalysisRequest {
  images: {
    name: string;
    data: string; // base64
    type: string;
  }[];
  systemPrompt: string;
  batchId: string;
}

export interface AnalysisResponse {
  success: boolean;
  result?: DiagnosticResult;
  error?: APIError;
}

export interface BatchProcessingStatus {
  totalBatches: number;
  completedBatches: number;
  failedBatches: number;
  currentBatch?: string;
  overallProgress: number;
  estimatedTimeRemaining?: number;
}

// Default configuration
export const DEFAULT_CONFIG: UploadConfig = {
  maxImages: 200,
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: [
    'image/jpeg',
    'image/png', 
    'image/tiff',
    'image/bmp',
    'application/dicom',
    'image/dicom'
  ],
  batchSize: 20
};

export const DEFAULT_SYSTEM_PROMPT = `You are an expert radiologist AI assistant. Analyze the provided medical images and provide a comprehensive diagnostic report.

For each batch of images, please provide:

1. **DETAILED FINDINGS**: Describe what you observe in the images, including:
   - Anatomical structures visible
   - Any abnormalities, lesions, or pathological findings
   - Image quality and technical adequacy
   - Comparative analysis between images if applicable

2. **CLINICAL SIGNIFICANCE**: Assess the medical importance of findings:
   - Potential diagnoses or differential diagnoses
   - Severity assessment where applicable
   - Relationship between findings across multiple images

3. **RECOMMENDATIONS**: Provide actionable next steps:
   - Additional imaging studies if needed
   - Clinical correlation requirements
   - Follow-up recommendations
   - Urgent findings requiring immediate attention

4. **TECHNICAL NOTES**: Comment on:
   - Image acquisition quality
   - Positioning and technique adequacy
   - Any limitations in interpretation

Please maintain professional medical terminology while ensuring clarity. Focus on accuracy and clinical relevance.`;