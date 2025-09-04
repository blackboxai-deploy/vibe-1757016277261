import { UploadedImage, ImageBatch, DEFAULT_CONFIG } from './types';

export class ImageProcessor {
  /**
   * Convert File to base64 string
   */
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Create preview URL for uploaded image
   */
  static createPreviewURL(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Validate uploaded image file
   */
  static validateImage(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!DEFAULT_CONFIG.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type}. Allowed types: ${DEFAULT_CONFIG.allowedTypes.join(', ')}`
      };
    }

    // Check file size
    if (file.size > DEFAULT_CONFIG.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds limit. Maximum size: ${this.formatFileSize(DEFAULT_CONFIG.maxFileSize)}`
      };
    }

    // Basic file structure validation
    if (file.size === 0) {
      return {
        valid: false,
        error: 'File appears to be empty'
      };
    }

    return { valid: true };
  }

  /**
   * Process uploaded files into UploadedImage objects
   */
  static async processUploadedFiles(files: FileList | File[]): Promise<UploadedImage[]> {
    const fileArray = Array.from(files);
    const processedImages: UploadedImage[] = [];

    for (const file of fileArray) {
      try {
        const validation = this.validateImage(file);
        
        const uploadedImage: UploadedImage = {
          id: this.generateImageId(file),
          file,
          preview: this.createPreviewURL(file),
          size: file.size,
          type: file.type,
          name: file.name,
          status: validation.valid ? 'pending' : 'error',
          error: validation.error
        };

        processedImages.push(uploadedImage);
      } catch (error) {
        console.error('Error processing file:', file.name, error);
        processedImages.push({
          id: this.generateImageId(file),
          file,
          preview: '',
          size: file.size,
          type: file.type,
          name: file.name,
          status: 'error',
          error: 'Failed to process file'
        });
      }
    }

    return processedImages;
  }

  /**
   * Organize images into batches for API processing
   */
  static createBatches(images: UploadedImage[], batchSize = DEFAULT_CONFIG.batchSize): ImageBatch[] {
    const batches: ImageBatch[] = [];
    const validImages = images.filter(img => img.status !== 'error');

    for (let i = 0; i < validImages.length; i += batchSize) {
      const batchImages = validImages.slice(i, i + batchSize);
      
      batches.push({
        id: `batch-${Math.floor(i / batchSize) + 1}-${Date.now()}`,
        images: batchImages,
        status: 'pending'
      });
    }

    return batches;
  }

  /**
   * Convert images in a batch to base64 format
   */
  static async prepareBatchForAPI(batch: ImageBatch): Promise<{
    name: string;
    data: string;
    type: string;
  }[]> {
    const apiImages = [];

    for (const image of batch.images) {
      try {
        const base64Data = await this.fileToBase64(image.file);
        
        apiImages.push({
          name: image.name,
          data: base64Data,
          type: image.type
        });
      } catch (error) {
        console.error(`Failed to convert ${image.name} to base64:`, error);
        throw new Error(`Failed to prepare image ${image.name} for analysis`);
      }
    }

    return apiImages;
  }

  /**
   * Clean up preview URLs to prevent memory leaks
   */
  static cleanupPreviewURLs(images: UploadedImage[]): void {
    images.forEach(image => {
      if (image.preview && image.preview.startsWith('blob:')) {
        URL.revokeObjectURL(image.preview);
      }
    });
  }

  /**
   * Generate unique ID for uploaded image
   */
  private static generateImageId(file: File): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${timestamp}-${random}-${safeName}`;
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file type display name
   */
  static getFileTypeDisplay(mimeType: string): string {
    const typeMap: Record<string, string> = {
      'image/jpeg': 'JPEG Image',
      'image/png': 'PNG Image',
      'image/tiff': 'TIFF Image',
      'image/bmp': 'BMP Image',
      'application/dicom': 'DICOM Image',
      'image/dicom': 'DICOM Image'
    };

    return typeMap[mimeType] || mimeType;
  }

  /**
   * Calculate total processing estimate
   */
  static estimateProcessingTime(totalImages: number): number {
    const batchCount = Math.ceil(totalImages / DEFAULT_CONFIG.batchSize);
    const averageTimePerBatch = 30; // seconds
    return batchCount * averageTimePerBatch;
  }

  /**
   * Validate batch for API submission
   */
  static validateBatchForAPI(batch: ImageBatch): { valid: boolean; error?: string } {
    if (batch.images.length === 0) {
      return { valid: false, error: 'Batch contains no images' };
    }

    if (batch.images.length > DEFAULT_CONFIG.batchSize) {
      return { valid: false, error: `Batch exceeds maximum size of ${DEFAULT_CONFIG.batchSize} images` };
    }

    const invalidImages = batch.images.filter(img => img.status === 'error');
    if (invalidImages.length > 0) {
      return { 
        valid: false, 
        error: `Batch contains ${invalidImages.length} invalid images` 
      };
    }

    return { valid: true };
  }
}