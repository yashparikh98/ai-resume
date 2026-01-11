"use client";

import { useState } from "react";
import { ConversationState, Answer } from "@/types";
import { ResumeUpload } from "@/components/upload/ResumeUpload";
import { JobDescriptionInput } from "@/components/upload/JobDescriptionInput";
import { QuestionFlow } from "@/components/qa/QuestionFlow";
import { SuggestionsView } from "@/components/suggestions/SuggestionsView";

export default function Home() {
  const [state, setState] = useState<ConversationState>({
    step: "upload",
    questions: [],
    answers: [],
    suggestions: [],
    conversationHistory: [],
  });

  const handleResumeUpload = (resume: ConversationState["resume"]) => {
    setState((prev) => ({
      ...prev,
      resume,
      step: "jd",
    }));
    // Store in sessionStorage
    if (typeof window !== "undefined" && resume) {
      sessionStorage.setItem("resume", JSON.stringify(resume));
    }
  };

  const handleJobDescriptionSubmit = (jd: ConversationState["jobDescription"]) => {
    setState((prev) => ({
      ...prev,
      jobDescription: jd,
      step: "questions",
    }));
    // Store in sessionStorage
    if (typeof window !== "undefined" && jd) {
      sessionStorage.setItem("jobDescription", JSON.stringify(jd));
    }
  };

  const handleQuestionsComplete = (answers: Answer[]) => {
    setState((prev) => ({
      ...prev,
      answers,
      step: "suggestions",
    }));
  };

  const handleSuggestionAccept = (suggestionId: string) => {
    // Handle suggestion acceptance
    console.log("Accepted suggestion:", suggestionId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AI Resume Curator
          </h1>
          <p className="text-lg text-gray-600">
            Tailor your resume for any job description with AI-powered insights
          </p>
        </header>

        <main className="bg-white rounded-lg shadow-xl p-6 md:p-8">
          {state.step === "upload" && (
            <ResumeUpload onUpload={handleResumeUpload} />
          )}

          {state.step === "jd" && (
            <JobDescriptionInput
              onSubmit={handleJobDescriptionSubmit}
              onBack={() => setState((prev) => ({ ...prev, step: "upload" }))}
            />
          )}

          {state.step === "questions" && (
            <QuestionFlow
              resume={state.resume!}
              jobDescription={state.jobDescription!}
              onComplete={handleQuestionsComplete}
              onBack={() => setState((prev) => ({ ...prev, step: "jd" }))}
            />
          )}

          {state.step === "suggestions" && (
            <SuggestionsView
              resume={state.resume!}
              jobDescription={state.jobDescription!}
              answers={state.answers}
              onAccept={handleSuggestionAccept}
            />
          )}
        </main>
      </div>
    </div>
  );
}
