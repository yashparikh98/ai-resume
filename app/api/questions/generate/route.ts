import { NextRequest, NextResponse } from "next/server";
import { Question } from "@/types";
import { aiClient } from "@/lib/ai/client";

export async function POST(request: NextRequest) {
  try {
    const { resume, jobDescription } = await request.json();

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: "Resume and job description are required" },
        { status: 400 }
      );
    }

    const questions = await aiClient.generateQuestions(resume, jobDescription);

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Error generating questions:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's an API key issue
    if (errorMessage.includes("API key") || errorMessage.includes("not initialized") || errorMessage.includes("401")) {
      const provider = process.env.AI_PROVIDER || "openai";
      const apiKeyName = provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
      const consoleUrl = provider === "openai" ? "platform.openai.com" : "console.anthropic.com";
      
      return NextResponse.json(
        { 
          error: "API Key Required",
          details: `Please set ${apiKeyName} in your Vercel environment variables.`,
          suggestion: `Get your API key from ${consoleUrl} and add it to your Vercel project settings.`
        },
        { status: 401 }
      );
    }
    
    // Check if it's a JSON parsing error
    if (errorMessage.includes("JSON") || errorMessage.includes("parse")) {
      return NextResponse.json(
        { 
          error: "Failed to parse AI response",
          details: errorMessage,
          suggestion: "The AI returned an invalid response. Please try again."
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Failed to generate questions",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
