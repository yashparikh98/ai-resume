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
    console.error("Full error:", error);
    console.error("API Key present:", !!process.env.OPENAI_API_KEY);
    console.error("Provider:", process.env.AI_PROVIDER);
    
    return NextResponse.json(
      { 
        error: "Failed to generate questions",
        details: errorMessage,
        // Include helpful info in development
        ...(process.env.NODE_ENV === "development" && {
          debug: {
            hasApiKey: !!process.env.OPENAI_API_KEY,
            provider: process.env.AI_PROVIDER,
            model: process.env.AI_MODEL,
          }
        })
      },
      { status: 500 }
    );
  }
}
