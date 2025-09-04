'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { DEFAULT_SYSTEM_PROMPT } from '@/lib/types';

interface SettingsPanelProps {
  systemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
}

export default function SettingsPanel({ systemPrompt, onSystemPromptChange }: SettingsPanelProps) {
  const [localPrompt, setLocalPrompt] = useState(systemPrompt);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setHasUnsavedChanges(localPrompt !== systemPrompt);
  }, [localPrompt, systemPrompt]);

  const handleSave = async () => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const response = await fetch('/api/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: localPrompt }),
      });

      const data = await response.json();

      if (data.success) {
        onSystemPromptChange(localPrompt);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        console.error('Failed to save prompt:', data.error);
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const response = await fetch('/api/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reset: true }),
      });

      const data = await response.json();

      if (data.success) {
        setLocalPrompt(data.prompt);
        onSystemPromptChange(data.prompt);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        console.error('Failed to reset prompt:', data.error);
      }
    } catch (error) {
      console.error('Error resetting prompt:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const isDefault = localPrompt === DEFAULT_SYSTEM_PROMPT;
  const characterCount = localPrompt.length;
  const wordCount = localPrompt.trim().split(/\s+/).length;

  return (
    <div className="space-y-6">
      {/* System Prompt Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            System Prompt Configuration
            <div className="flex gap-2">
              {isDefault && <Badge variant="outline">Default</Badge>}
              {hasUnsavedChanges && <Badge variant="secondary">Unsaved Changes</Badge>}
              {saveStatus === 'success' && <Badge variant="default">Saved</Badge>}
              {saveStatus === 'error' && <Badge variant="destructive">Save Failed</Badge>}
            </div>
          </CardTitle>
          <CardDescription>
            Customize the AI system prompt to tailor the diagnostic analysis to your specific needs and preferences.
            This prompt guides how Claude Sonnet 4 analyzes your medical images.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="system-prompt" className="text-sm font-medium">
                System Prompt
              </label>
              <div className="text-xs text-gray-500">
                {characterCount} characters • {wordCount} words
              </div>
            </div>
            
            <Textarea
              id="system-prompt"
              value={localPrompt}
              onChange={(e) => setLocalPrompt(e.target.value)}
              className="min-h-64 text-sm"
              placeholder="Enter your custom system prompt..."
            />
            
            <div className="text-xs text-gray-500">
              Minimum 50 characters. Should include medical/diagnostic context.
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving || characterCount < 50}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isSaving || isDefault}
            >
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prompt Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Writing Effective Prompts</CardTitle>
          <CardDescription>
            Best practices for creating diagnostic system prompts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-green-600">✓ Do Include</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Clear role definition (radiologist assistant)</li>
                <li>• Specific analysis requirements</li>
                <li>• Structured output format preferences</li>
                <li>• Medical terminology expectations</li>
                <li>• Clinical context requirements</li>
                <li>• Quality assessment criteria</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-red-600">✗ Avoid</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Overly complex instructions</li>
                <li>• Contradictory requirements</li>
                <li>• Irrelevant personal information</li>
                <li>• Extremely long prompts (&gt;4000 chars)</li>
                <li>• Non-medical contexts</li>
                <li>• Diagnostic certainty requests</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Prompt Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Default System Prompt Reference</CardTitle>
          <CardDescription>
            The standard prompt used for diagnostic analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap">
              {DEFAULT_SYSTEM_PROMPT}
            </pre>
          </div>
          
          <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
            <span>Default prompt characteristics:</span>
            <div className="flex gap-4">
              <span>{DEFAULT_SYSTEM_PROMPT.length} characters</span>
              <span>{DEFAULT_SYSTEM_PROMPT.trim().split(/\s+/).length} words</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Configuration</CardTitle>
          <CardDescription>
            Current system processing parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="font-medium text-blue-900">Batch Size</div>
              <div className="text-blue-600">20 images</div>
            </div>
            
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="font-medium text-green-900">Max Images</div>
              <div className="text-green-600">200 total</div>
            </div>
            
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="font-medium text-purple-900">File Size Limit</div>
              <div className="text-purple-600">50MB each</div>
            </div>
            
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="font-medium text-orange-900">Supported Formats</div>
              <div className="text-orange-600">JPEG, PNG, TIFF, BMP, DICOM</div>
            </div>
            
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="font-medium text-red-900">API Model</div>
              <div className="text-red-600">Claude Sonnet 4</div>
            </div>
            
            <div className="p-3 bg-indigo-50 rounded-lg">
              <div className="font-medium text-indigo-900">Processing</div>
              <div className="text-indigo-600">Parallel batches</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {saveStatus === 'success' && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            System prompt saved successfully. Changes will apply to all future analyses.
          </AlertDescription>
        </Alert>
      )}

      {saveStatus === 'error' && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            Failed to save system prompt. Please check your connection and try again.
          </AlertDescription>
        </Alert>
      )}

      {hasUnsavedChanges && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertDescription className="text-yellow-800">
            You have unsaved changes to your system prompt. Remember to save before starting analysis.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}