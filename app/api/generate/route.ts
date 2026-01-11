import { NextRequest, NextResponse } from "next/server";
import { Suggestion, Answer } from "@/types";
import { aiClient } from "@/lib/ai/client";

export async function POST(request: NextRequest) {
  try {
    const { resume, jobDescription, suggestions, answers } = await request.json();

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: "Resume and job description are required" },
        { status: 400 }
      );
    }

    // Suggestions passed are already filtered to only accepted ones
    const acceptedSuggestions = suggestions || [];

    console.log("Generating resume with:", {
      resumeLength: resume.length,
      jdLength: jobDescription.length,
      suggestionsCount: acceptedSuggestions.length,
      answersCount: (answers || []).length,
    });

    const curatedResume = await aiClient.generateResume(
      resume,
      jobDescription,
      acceptedSuggestions,
      answers || []
    );

    return NextResponse.json({ 
      resume: curatedResume,
      suggestionsApplied: acceptedSuggestions.length
    });
  } catch (error) {
    console.error("Error generating resume:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate resume",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
