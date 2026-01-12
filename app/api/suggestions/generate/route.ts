import { NextRequest, NextResponse } from "next/server";
import { Suggestion, Answer } from "@/types";
import { aiClient } from "@/lib/ai/client";

export async function POST(request: NextRequest) {
  try {
    const { resume, jobDescription, answers } = await request.json();

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: "Resume and job description are required" },
        { status: 400 }
      );
    }

    // Answers can be empty array, but should be provided
    if (!Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Answers must be an array" },
        { status: 400 }
      );
    }

    console.log("Generating suggestions with:", {
      resumeLength: resume?.length || 0,
      jdLength: jobDescription?.length || 0,
      answersCount: answers?.length || 0,
    });

    const suggestions = await aiClient.generateSuggestions(
      resume,
      jobDescription,
      answers
    );

    console.log("Generated suggestions count:", suggestions?.length || 0);

    return NextResponse.json({ suggestions: suggestions || [] });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Full error details:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to generate suggestions",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
