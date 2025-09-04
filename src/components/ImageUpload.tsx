'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UploadedImage } from '@/lib/types';
import { ImageProcessor } from '@/lib/image-processing';

interface ImageUploadProps {
  images: UploadedImage[];
  onUpload: (files: FileList | File[]) => Promise<void>;
  onRemove: (imageId: string) => void;
  onClear: () => void;
}

export default function ImageUpload({ images, onUpload, onRemove, onClear }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setIsUploading(true);

    const files = Array.from(e.dataTransfer.files) as File[];
    await onUpload(files);
    
    setIsUploading(false);
  }, [onUpload]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    await onUpload(files);
    setIsUploading(false);
    
    // Reset input
    e.target.value = '';
  }, [onUpload]);

  const validImages = images.filter(img => img.status !== 'error');
  const errorImages = images.filter(img => img.status === 'error');
  const remainingSlots = 200 - images.length;

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isUploading ? 'Processing images...' : 'Upload Medical Images'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Drag and drop files here, or click to select
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2 justify-center items-center mb-4">
              <label htmlFor="file-input">
                <Button 
                  variant="outline" 
                  disabled={isUploading || remainingSlots <= 0}
                  asChild
                >
                  <span className="cursor-pointer">
                    {isUploading ? 'Uploading...' : 'Select Files'}
                  </span>
                </Button>
              </label>
              <input
                id="file-input"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/tiff,image/bmp,.dcm,.dicom"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading || remainingSlots <= 0}
              />
              
              {images.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={onClear}
                  disabled={isUploading}
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>Supported formats: JPEG, PNG, TIFF, BMP, DICOM</p>
            <p>Maximum: 200 images, 50MB per file</p>
            <p>Remaining slots: <strong>{remainingSlots}</strong></p>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {errorImages.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            <strong>{errorImages.length} files failed to upload:</strong>
            <ul className="mt-2 space-y-1">
              {errorImages.slice(0, 5).map(img => (
                <li key={img.id} className="text-sm">
                  • {img.name}: {img.error}
                </li>
              ))}
              {errorImages.length > 5 && (
                <li className="text-sm">• ...and {errorImages.length - 5} more</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Images Grid */}
      {validImages.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Uploaded Images ({validImages.length}/200)
              </h3>
              <div className="flex gap-2">
                <Badge variant="outline">
                  Total Size: {ImageProcessor.formatFileSize(
                    validImages.reduce((sum, img) => sum + img.size, 0)
                  )}
                </Badge>
                <Badge variant="default">
                  {Math.ceil(validImages.length / 20)} Batches
                </Badge>
              </div>
            </div>
            
            <ScrollArea className="h-96">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {validImages.map((image, index) => (
                  <div key={image.id} className="group relative">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      {image.preview ? (
                        <img
                          src={image.preview}
                          alt={image.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to placeholder if preview fails
                            const target = e.target as HTMLImageElement;
                            target.src = `https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/17616cec-9905-4b96-8b22-bd80fddeeb9f.png}`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">
                              {ImageProcessor.getFileTypeDisplay(image.type)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {ImageProcessor.formatFileSize(image.size)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Overlay with image info */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onRemove(image.id)}
                        className="text-xs"
                      >
                        Remove
                      </Button>
                    </div>
                    
                    {/* Image number badge */}
                    <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                      #{index + 1}
                    </div>
                    
                    {/* Status badge */}
                    <div className="absolute top-2 right-2">
                      <Badge 
                        variant={
                          image.status === 'completed' ? 'default' :
                          image.status === 'processing' ? 'secondary' :
                          image.status === 'error' ? 'destructive' : 'outline'
                        }
                        className="text-xs"
                      >
                        {image.status}
                      </Badge>
                    </div>

                    {/* File info tooltip */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="truncate font-medium">{image.name}</p>
                      <p>{ImageProcessor.formatFileSize(image.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Batch Information */}
      {validImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{validImages.length}</div>
              <div className="text-sm text-gray-600">Total Images</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{Math.ceil(validImages.length / 20)}</div>
              <div className="text-sm text-gray-600">Processing Batches</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {ImageProcessor.formatFileSize(validImages.reduce((sum, img) => sum + img.size, 0))}
              </div>
              <div className="text-sm text-gray-600">Total Size</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                ~{Math.ceil(validImages.length / 20 * 0.5)}m
              </div>
              <div className="text-sm text-gray-600">Est. Process Time</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}