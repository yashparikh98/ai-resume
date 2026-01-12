import { NextRequest, NextResponse } from "next/server";
import { Question, Answer } from "@/types";
import { aiClient } from "@/lib/ai/client";

export async function POST(request: NextRequest) {
  try {
    const { resume, jobDescription, answers, questionText, selectedAnswer } = await request.json();

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: "Resume and job description are required" },
        { status: 400 }
      );
    }

    // If questionText and selectedAnswer are provided, generate clarifying questions for that specific answer
    if (questionText && selectedAnswer) {
      const questions = await aiClient.generateFollowUpQuestions(
        resume,
        jobDescription,
        answers || [],
        questionText,
        selectedAnswer
      );
      return NextResponse.json({ questions });
    }

    // Otherwise, use the general follow-up logic
    if (!answers) {
      return NextResponse.json(
        { error: "Answers are required" },
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
