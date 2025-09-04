'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ImageUpload from '@/components/ImageUpload';
import ProgressTracker from '@/components/ProgressTracker';
import ReportDisplay from '@/components/ReportDisplay';
import SettingsPanel from '@/components/SettingsPanel';
import { useUpload } from '@/hooks/use-upload';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/types';

export default function RadiologyDashboard() {
  const [activeTab, setActiveTab] = useState('upload');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  
  const {
    images,
    batches,
    isProcessing,
    processingStatus,
    report,
    error,
    uploadImages,
    removeImage,
    clearAllImages,
    startAnalysis,
    resetAnalysis
  } = useUpload();

  const handleStartAnalysis = async () => {
    await startAnalysis(systemPrompt);
    if (!isProcessing) {
      setActiveTab('results');
    }
  };

  const totalValidImages = images.filter(img => img.status !== 'error').length;
  const hasImages = images.length > 0;
  const hasValidImages = totalValidImages > 0;
  const canAnalyze = hasValidImages && !isProcessing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Radiology Diagnostic System
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Advanced AI-powered medical image analysis using Claude Sonnet 4. 
            Upload up to 200 images for comprehensive diagnostic reporting.
          </p>
          
          {/* Status Summary */}
          <div className="flex justify-center gap-4 mt-6">
            <Badge variant={hasImages ? "default" : "secondary"} className="px-4 py-2">
              {images.length} Images Uploaded
            </Badge>
            <Badge variant={hasValidImages ? "default" : "secondary"} className="px-4 py-2">
              {totalValidImages} Valid for Analysis
            </Badge>
            <Badge variant={batches.length > 0 ? "default" : "secondary"} className="px-4 py-2">
              {batches.length} Processing Batches
            </Badge>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Interface */}
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                Upload Images
                {hasImages && (
                  <Badge variant="secondary" className="ml-1">
                    {images.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                Settings
              </TabsTrigger>
              <TabsTrigger value="processing" disabled={!isProcessing} className="flex items-center gap-2">
                Processing
                {isProcessing && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse ml-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="results" disabled={!report && !isProcessing} className="flex items-center gap-2">
                Results
                {report && (
                  <Badge variant="default" className="ml-1">
                    Ready
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Medical Image Upload</CardTitle>
                    <CardDescription>
                      Upload medical images for AI-powered diagnostic analysis. 
                      Supports JPEG, PNG, TIFF, BMP, and DICOM formats. Maximum 200 images, 50MB per file.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ImageUpload
                      images={images}
                      onUpload={uploadImages}
                      onRemove={removeImage}
                      onClear={clearAllImages}
                    />
                  </CardContent>
                </Card>

                {/* Analysis Controls */}
                {hasValidImages && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Analysis Overview</CardTitle>
                      <CardDescription>
                        Ready to analyze {totalValidImages} valid medical images across {batches.length} processing batches
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="flex-1 space-y-2">
                          <p className="text-sm text-gray-600">
                            <strong>Processing Strategy:</strong> Images will be analyzed in batches of 20 using Claude Sonnet 4
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Estimated Time:</strong> ~{Math.ceil(batches.length * 0.5)} minutes
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => setActiveTab('settings')} 
                            variant="outline"
                            disabled={isProcessing}
                          >
                            Configure Settings
                          </Button>
                          <Button 
                            onClick={handleStartAnalysis}
                            disabled={!canAnalyze}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {isProcessing ? 'Processing...' : 'Start Analysis'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <SettingsPanel 
                systemPrompt={systemPrompt}
                onSystemPromptChange={setSystemPrompt}
              />
            </TabsContent>

            {/* Processing Tab */}
            <TabsContent value="processing">
              <ProgressTracker
                batches={batches}
                processingStatus={processingStatus}
                isProcessing={isProcessing}
              />
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results">
              <ReportDisplay
                report={report}
                batches={batches}
                onReset={resetAnalysis}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Professional Radiology AI Assistant • Powered by Advanced Machine Learning
          </p>
          <p className="text-xs text-gray-400 mt-2">
            This system provides AI-assisted analysis. All results should be reviewed by qualified medical professionals.
          </p>
        </div>
      </div>
    </div>
  );
}