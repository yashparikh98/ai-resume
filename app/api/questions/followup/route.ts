import { NextRequest, NextResponse } from "next/server";
import { Question, Answer } from "@/types";
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

    const questions = await aiClient.generateFollowUpQuestions(
      resume,
      jobDescription,
      answers
    );

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Error generating follow-up questions:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate follow-up questions",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
