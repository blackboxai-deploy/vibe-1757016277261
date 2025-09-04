'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConsolidatedReport, ImageBatch } from '@/lib/types';

interface ReportDisplayProps {
  report: ConsolidatedReport | null;
  batches: ImageBatch[];
  onReset: () => void;
}

export default function ReportDisplay({ report, batches, onReset }: ReportDisplayProps) {
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const exportReport = (format: 'json' | 'text') => {
    if (!report) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(report, null, 2);
      filename = `radiology-report-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else {
      content = generateTextReport(report);
      filename = `radiology-report-${new Date().toISOString().split('T')[0]}.txt`;
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateTextReport = (report: ConsolidatedReport): string => {
    const processingTime = report.processingEndTime 
      ? formatDuration(report.processingEndTime - report.processingStartTime)
      : 'Processing incomplete';

    return `RADIOLOGY DIAGNOSTIC REPORT
Generated: ${formatDate(Date.now())}
Report ID: ${report.id}

SUMMARY
=======
Total Images Analyzed: ${report.totalImages}
Processing Batches: ${report.totalBatches}
Successful Batches: ${report.completedBatches}
Failed Batches: ${report.failedBatches}
Processing Time: ${processingTime}
Status: ${report.status}

CONSOLIDATED FINDINGS
===================
${report.overallFindings}

RECOMMENDATIONS
==============
${report.recommendations.join('\n\n')}

CONFIDENCE ASSESSMENT
===================
${report.confidence}

DETAILED BATCH RESULTS
=====================
${report.detailedFindings.map((finding, index) => `
Batch ${index + 1} (${finding.imageCount} images):
Processing Time: ${formatDuration(finding.processingTime)}

Findings:
${finding.findings}

Recommendations:
${finding.recommendations}

Technical Notes:
${finding.technicalNotes || 'None'}

---
`).join('')}

DISCLAIMER
==========
This report was generated using AI-assisted analysis. All findings and recommendations should be reviewed and validated by qualified medical professionals before making any clinical decisions.`;
  };

  if (!report) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Available</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload images and start analysis to generate a diagnostic report.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedBatches = batches.filter(b => b.status === 'completed');
  const failedBatches = batches.filter(b => b.status === 'error');

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Diagnostic Report</CardTitle>
              <CardDescription>
                Generated on {formatDate(Date.now())} • Report ID: {report.id}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => exportReport('text')}>
                Export as Text
              </Button>
              <Button variant="outline" onClick={() => exportReport('json')}>
                Export as JSON
              </Button>
              <Button variant="destructive" onClick={onReset}>
                Reset Analysis
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Processing Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{report.totalImages}</div>
              <div className="text-sm text-gray-600">Images Analyzed</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{report.completedBatches}</div>
              <div className="text-sm text-gray-600">Successful Batches</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{report.failedBatches}</div>
              <div className="text-sm text-gray-600">Failed Batches</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {report.processingEndTime 
                  ? formatDuration(report.processingEndTime - report.processingStartTime)
                  : 'N/A'
                }
              </div>
              <div className="text-sm text-gray-600">Processing Time</div>
            </div>
          </div>

          <div className="flex justify-center">
            <Badge 
              variant={
                report.status === 'completed' ? 'default' : 
                report.status === 'error' ? 'destructive' : 'secondary'
              }
              className="px-4 py-2"
            >
              Status: {report.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Main Report Content */}
      <Tabs defaultValue="consolidated" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="consolidated">Consolidated Report</TabsTrigger>
          <TabsTrigger value="batches">Batch Details</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Consolidated Findings */}
        <TabsContent value="consolidated">
          <Card>
            <CardHeader>
              <CardTitle>Consolidated Findings</CardTitle>
              <CardDescription>
                Combined analysis of all {report.totalImages} medical images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {report.overallFindings}
                  </div>
                </div>
              </ScrollArea>
              
              <Separator className="my-6" />
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Confidence Assessment</h4>
                  <p className="text-sm text-gray-600">{report.confidence}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batch Details */}
        <TabsContent value="batches">
          <div className="space-y-4">
            {/* Batch Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Individual Batch Analysis</CardTitle>
                <CardDescription>
                  Detailed findings from each processing batch
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  {completedBatches.map((batch, index) => (
                    <Button
                      key={batch.id}
                      variant={selectedBatch === batch.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedBatch(batch.id)}
                      className="justify-start"
                    >
                      Batch {index + 1}
                      <Badge variant="secondary" className="ml-2">
                        {batch.images.length}
                      </Badge>
                    </Button>
                  ))}
                </div>

                {selectedBatch && (() => {
                  const batch = completedBatches.find(b => b.id === selectedBatch);
                  if (!batch || !batch.result) return null;

                  return (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">
                          Batch Analysis - {batch.images.length} images
                        </h4>
                        <Badge variant="outline">
                          {formatDuration(batch.result.processingTime)}
                        </Badge>
                      </div>

                      <ScrollArea className="h-64 p-4 border rounded-lg">
                        <div className="space-y-4">
                          <div>
                            <h5 className="font-medium text-sm mb-2">Findings:</h5>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {batch.result.findings}
                            </p>
                          </div>
                          
                          <Separator />
                          
                          <div>
                            <h5 className="font-medium text-sm mb-2">Recommendations:</h5>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {batch.result.recommendations}
                            </p>
                          </div>

                          {batch.result.technicalNotes && (
                            <>
                              <Separator />
                              <div>
                                <h5 className="font-medium text-sm mb-2">Technical Notes:</h5>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {batch.result.technicalNotes}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </ScrollArea>

                      <div className="text-xs text-gray-500">
                        Images in this batch: {batch.images.map(img => img.name).join(', ')}
                      </div>
                    </div>
                  );
                })()}

                {!selectedBatch && completedBatches.length > 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Select a batch above to view detailed analysis
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recommendations */}
        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>Clinical Recommendations</CardTitle>
              <CardDescription>
                Actionable recommendations based on the analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.recommendations.length > 0 ? (
                  report.recommendations.map((rec, index) => (
                    <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 text-sm text-blue-900 whitespace-pre-wrap">
                          {rec}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No specific recommendations generated
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Failed Batches Alert */}
      {failedBatches.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            <strong>Warning:</strong> {failedBatches.length} batch(es) failed to process. 
            The report may be incomplete. Failed batches: {failedBatches.map(b => b.id).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Medical Disclaimer */}
      <Alert>
        <AlertDescription>
          <strong>Medical Disclaimer:</strong> This report was generated using AI-assisted analysis. 
          All findings and recommendations should be reviewed and validated by qualified medical professionals 
          before making any clinical decisions. This system is designed to assist, not replace, professional medical judgment.
        </AlertDescription>
      </Alert>
    </div>
  );
}