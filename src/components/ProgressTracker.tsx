'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageBatch, BatchProcessingStatus } from '@/lib/types';

interface ProgressTrackerProps {
  batches: ImageBatch[];
  processingStatus: BatchProcessingStatus;
  isProcessing: boolean;
}

export default function ProgressTracker({ 
  batches, 
  processingStatus, 
  isProcessing 
}: ProgressTrackerProps) {
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'processing':
        return '⏳';
      case 'error':
        return '✗';
      default:
        return '⏸';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Progress</CardTitle>
          <CardDescription>
            {isProcessing 
              ? `Processing ${batches.length} batches of medical images...` 
              : `Analysis ${processingStatus.overallProgress === 100 ? 'completed' : 'ready'}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{processingStatus.overallProgress}%</span>
            </div>
            <Progress 
              value={processingStatus.overallProgress} 
              className="w-full h-3"
            />
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {processingStatus.totalBatches}
              </div>
              <div className="text-sm text-gray-600">Total Batches</div>
            </div>
            
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {processingStatus.completedBatches}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {processingStatus.failedBatches}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {processingStatus.totalBatches - processingStatus.completedBatches - processingStatus.failedBatches}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>

          {/* Current Batch Info */}
          {isProcessing && processingStatus.currentBatch && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="font-medium text-blue-900">
                  Currently processing: {processingStatus.currentBatch}
                </span>
              </div>
            </div>
          )}

          {/* Time Estimates */}
          {isProcessing && processingStatus.estimatedTimeRemaining && (
            <div className="text-sm text-gray-600">
              <span>Estimated time remaining: </span>
              <span className="font-medium">
                {formatDuration(processingStatus.estimatedTimeRemaining)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Details */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Processing Details</CardTitle>
          <CardDescription>
            Individual batch status and processing times
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {batches.map((batch, index) => (
                <div
                  key={batch.id}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    batch.status === 'processing' 
                      ? 'border-blue-200 bg-blue-50' 
                      : batch.status === 'completed'
                      ? 'border-green-200 bg-green-50'
                      : batch.status === 'error'
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-lg">
                        {getStatusIcon(batch.status)}
                      </div>
                      <div>
                        <h3 className="font-medium">
                          Batch {index + 1} of {batches.length}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {batch.images.length} images
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(batch.status)}>
                        {batch.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Batch Progress */}
                  {batch.status === 'processing' && (
                    <div className="mb-2">
                      <Progress value={50} className="h-2" />
                    </div>
                  )}

                  {/* Processing Time */}
                  {batch.startTime && (
                    <div className="text-xs text-gray-500">
                      {batch.status === 'processing' ? (
                        <span>
                          Processing for {formatDuration(Date.now() - batch.startTime)}
                        </span>
                      ) : batch.endTime ? (
                        <span>
                          Processed in {formatDuration(batch.endTime - batch.startTime)}
                        </span>
                      ) : null}
                    </div>
                  )}

                  {/* Error Message */}
                  {batch.error && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-800">
                      <strong>Error:</strong> {batch.error}
                    </div>
                  )}

                  {/* Success Summary */}
                  {batch.status === 'completed' && batch.result && (
                    <div className="mt-2 p-2 bg-green-100 border border-green-200 rounded text-sm text-green-800">
                      <strong>Analysis completed:</strong> Generated diagnostic findings and recommendations
                    </div>
                  )}

                  {/* Image List */}
                  <div className="mt-3">
                    <div className="text-xs text-gray-500 mb-1">Images in this batch:</div>
                    <div className="flex flex-wrap gap-1">
                      {batch.images.slice(0, 5).map((image, imgIndex) => (
                        <Badge 
                          key={image.id} 
                          variant="outline" 
                          className="text-xs"
                        >
                          {imgIndex + 1}. {image.name.length > 15 
                            ? `${image.name.substring(0, 15)}...` 
                            : image.name
                          }
                        </Badge>
                      ))}
                      {batch.images.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{batch.images.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Processing Stats */}
      {batches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Images:</span>
                <span className="ml-2 font-medium">
                  {batches.reduce((sum, batch) => sum + batch.images.length, 0)}
                </span>
              </div>
              
              <div>
                <span className="text-gray-600">Avg Batch Size:</span>
                <span className="ml-2 font-medium">
                  {Math.round(batches.reduce((sum, batch) => sum + batch.images.length, 0) / batches.length)}
                </span>
              </div>
              
              <div>
                <span className="text-gray-600">Success Rate:</span>
                <span className="ml-2 font-medium text-green-600">
                  {processingStatus.totalBatches > 0 
                    ? Math.round((processingStatus.completedBatches / processingStatus.totalBatches) * 100)
                    : 0
                  }%
                </span>
              </div>

              <div>
                <span className="text-gray-600">Avg Processing Time:</span>
                <span className="ml-2 font-medium">
                  {(() => {
                    const completedBatches = batches.filter(b => 
                      b.status === 'completed' && b.startTime && b.endTime
                    );
                    if (completedBatches.length === 0) return <span>N/A</span>;
                    
                    const avgTime = completedBatches.reduce((sum, batch) => 
                      sum + (batch.endTime! - batch.startTime!), 0
                    ) / completedBatches.length;
                    
                    return <span>{formatDuration(avgTime)}</span>;
                  })()}
                </span>
              </div>

              <div>
                <span className="text-gray-600">Total Processing Time:</span>
                <span className="ml-2 font-medium">
                  {(() => {
                    const completedBatches = batches.filter(b => 
                      b.status === 'completed' && b.startTime && b.endTime
                    );
                    if (completedBatches.length === 0) return <span>N/A</span>;
                    
                    const totalTime = completedBatches.reduce((sum, batch) => 
                      sum + (batch.endTime! - batch.startTime!), 0
                    );
                    
                    return <span>{formatDuration(totalTime)}</span>;
                  })()}
                </span>
              </div>

              <div>
                <span className="text-gray-600">Status:</span>
                <span className="ml-2 font-medium">
                  {isProcessing ? (
                    <span className="text-blue-600">Processing</span>
                  ) : processingStatus.overallProgress === 100 ? (
                    <span className="text-green-600">Completed</span>
                  ) : (
                    <span className="text-gray-600">Ready</span>
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}