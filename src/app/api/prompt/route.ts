import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/types';

// In a real application, this would be stored in a database
// For this demo, we'll use in-memory storage
let currentSystemPrompt = DEFAULT_SYSTEM_PROMPT;

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      prompt: currentSystemPrompt,
      isDefault: currentSystemPrompt === DEFAULT_SYSTEM_PROMPT,
      lastModified: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching system prompt:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'FETCH_ERROR', 
          message: 'Failed to fetch system prompt' 
        } 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, reset } = body;

    // Handle reset to default
    if (reset === true) {
      currentSystemPrompt = DEFAULT_SYSTEM_PROMPT;
      return NextResponse.json({
        success: true,
        prompt: currentSystemPrompt,
        message: 'System prompt reset to default',
        isDefault: true
      });
    }

    // Validate new prompt
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'INVALID_PROMPT', 
            message: 'Prompt must be a non-empty string' 
          } 
        },
        { status: 400 }
      );
    }

    // Validate prompt length
    if (prompt.length < 50) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'PROMPT_TOO_SHORT', 
            message: 'System prompt must be at least 50 characters long' 
          } 
        },
        { status: 400 }
      );
    }

    if (prompt.length > 4000) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'PROMPT_TOO_LONG', 
            message: 'System prompt must not exceed 4000 characters' 
          } 
        },
        { status: 400 }
      );
    }

    // Basic content validation - ensure medical context
    const medicalKeywords = [
      'medical', 'diagnosis', 'diagnostic', 'radiology', 'radiologist', 
      'image', 'analysis', 'findings', 'clinical', 'patient'
    ];
    
    const hasMedialContext = medicalKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );

    if (!hasMedialContext) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'INVALID_MEDICAL_CONTEXT', 
            message: 'System prompt should include medical/diagnostic context' 
          } 
        },
        { status: 400 }
      );
    }

    // Update the system prompt
    currentSystemPrompt = prompt;

    return NextResponse.json({
      success: true,
      prompt: currentSystemPrompt,
      message: 'System prompt updated successfully',
      isDefault: currentSystemPrompt === DEFAULT_SYSTEM_PROMPT,
      lastModified: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating system prompt:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'UPDATE_ERROR', 
          message: error instanceof Error ? error.message : 'Failed to update system prompt' 
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}