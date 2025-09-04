import { AnalysisRequest, AnalysisResponse, DiagnosticResult } from './types';

// Claude Sonnet 4 API configuration
const API_ENDPOINT = 'https://oi-server.onrender.com/chat/completions';
const API_HEADERS = {
  'CustomerId': 'cus_RuCkUD5gposwKc',
  'Content-Type': 'application/json',
  'Authorization': 'Bearer xxx'
};
const MODEL = 'openrouter/anthropic/claude-sonnet-4';

export class RadiologyAPIClient {
  private static readonly REQUEST_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_RETRIES = 3;

  /**
   * Analyze a batch of medical images using Claude Sonnet 4
   */
  static async analyzeImageBatch(request: AnalysisRequest): Promise<AnalysisResponse> {
    const startTime = Date.now();
    
    try {
      // Validate batch size
      if (request.images.length === 0) {
        throw new Error('No images provided for analysis');
      }
      
      if (request.images.length > 20) {
        throw new Error('Batch size exceeds maximum limit of 20 images');
      }

      // Construct the multimodal message for Claude
      const messageContent = [
        {
          type: 'text',
          text: `Please analyze this batch of ${request.images.length} medical images and provide a comprehensive diagnostic report.`
        },
        ...request.images.map(img => ({
          type: 'image_url',
          image_url: {
            url: `data:${img.type};base64,${img.data}`
          }
        }))
      ];

      const payload = {
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: request.systemPrompt
          },
          {
            role: 'user',
            content: messageContent
          }
        ],
        max_tokens: 4000,
        temperature: 0.1 // Lower temperature for more consistent medical analysis
      };

      const response = await this.makeAPIRequest(payload);
      const processingTime = Date.now() - startTime;

      // Parse the response
      const analysisText = response.choices[0]?.message?.content;
      if (!analysisText) {
        throw new Error('No analysis content received from API');
      }

      // Extract structured information from the response
      const diagnosticResult: DiagnosticResult = this.parseAnalysisResponse(
        analysisText,
        request.batchId,
        request.images.length,
        processingTime
      );

      return {
        success: true,
        result: diagnosticResult
      };

    } catch (error) {
      console.error(`Batch analysis failed for ${request.batchId}:`, error);
      
      return {
        success: false,
        error: {
          code: 'ANALYSIS_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error
        }
      };
    }
  }

  /**
   * Make API request with retry logic and timeout handling
   */
  private static async makeAPIRequest(payload: any, retryCount = 0): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Retry logic for network errors
      if (retryCount < this.MAX_RETRIES && this.isRetryableError(error)) {
        console.warn(`API request failed, retrying (${retryCount + 1}/${this.MAX_RETRIES}):`, error);
        await this.delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
        return this.makeAPIRequest(payload, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Parse the AI response into structured diagnostic result
   */
  private static parseAnalysisResponse(
    analysisText: string,
    batchId: string,
    imageCount: number,
    processingTime: number
  ): DiagnosticResult {
    // Extract key sections from the response
    const sections = this.extractSections(analysisText);

    return {
      batchId,
      imageCount,
      findings: sections.findings || analysisText.substring(0, 1000) + '...', // Fallback to truncated text
      recommendations: sections.recommendations || 'Please refer to detailed findings above.',
      confidence: sections.confidence || 'Standard diagnostic confidence',
      technicalNotes: sections.technicalNotes,
      processingTime
    };
  }

  /**
   * Extract structured sections from AI response
   */
  private static extractSections(text: string): {
    findings?: string;
    recommendations?: string;
    confidence?: string;
    technicalNotes?: string;
  } {
    const sections: any = {};

    // Common section patterns to extract
    const patterns = {
      findings: /(?:DETAILED FINDINGS|FINDINGS|OBSERVATIONS):([\s\S]*?)(?=(?:CLINICAL SIGNIFICANCE|RECOMMENDATIONS|TECHNICAL NOTES|$))/gi,
      recommendations: /(?:RECOMMENDATIONS|NEXT STEPS|FOLLOW.?UP):([\s\S]*?)(?=(?:TECHNICAL NOTES|CONFIDENCE|$))/gi,
      confidence: /(?:CONFIDENCE|CERTAINTY|DIAGNOSTIC CONFIDENCE):([\s\S]*?)(?=(?:TECHNICAL NOTES|$))/gi,
      technicalNotes: /(?:TECHNICAL NOTES|TECHNICAL COMMENTS|IMAGE QUALITY):([\s\S]*?)$/gi
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match && match[1]) {
        sections[key] = match[1].trim();
      }
    }

    return sections;
  }

  /**
   * Check if an error is retryable
   */
  private static isRetryableError(error: any): boolean {
    if (error.name === 'AbortError') return false; // Don't retry timeouts
    if (error.message?.includes('429')) return true; // Rate limiting
    if (error.message?.includes('502')) return true; // Bad gateway
    if (error.message?.includes('503')) return true; // Service unavailable
    if (error.message?.includes('network')) return true; // Network errors
    return false;
  }

  /**
   * Utility function for delays
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate image data before sending to API
   */
  static validateImageData(imageData: string, type: string): boolean {
    try {
      // Check if it's valid base64
      const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Pattern.test(imageData.replace(/\s/g, ''))) {
        return false;
      }

      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp'];
      if (!allowedTypes.includes(type)) {
        return false;
      }

      // Estimate size (base64 is ~4/3 of original size)
      const estimatedSize = (imageData.length * 3) / 4;
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (estimatedSize > maxSize) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}