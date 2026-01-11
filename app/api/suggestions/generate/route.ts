import { NextRequest, NextResponse } from "next/server";
import { Suggestion, Answer } from "@/types";
import { aiClient } from "@/lib/ai/client";

export async function POST(request: NextRequest) {
  try {
    const { resume, jobDescription, answers } = await request.json();

    if (!resume || !jobDescription || !answers) {
      return NextResponse.json(
        { error: "Resume, job description, and answers are required" },
        { status: 400 }
      );
    }

    const suggestions = await aiClient.generateSuggestions(
      resume,
      jobDescription,
      answers
    );

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate suggestions",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
