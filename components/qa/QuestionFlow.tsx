"use client";

import { useState, useEffect } from "react";
import { Resume, JobDescription, Question, Answer } from "@/types";

interface QuestionFlowProps {
  resume: Resume;
  jobDescription: JobDescription;
  onComplete: (answers: Answer[]) => void;
  onBack: () => void;
}

export function QuestionFlow({
  resume,
  jobDescription,
  onComplete,
  onBack,
}: QuestionFlowProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followUpRounds, setFollowUpRounds] = useState(0);
  const [multipleChoiceAnswers, setMultipleChoiceAnswers] = useState<Record<string, string>>({});
  const [clarifyingQuestionMap, setClarifyingQuestionMap] = useState<Record<string, string>>({}); // Maps clarifying question ID to the MC answer it clarifies
  const [phase, setPhase] = useState<"multiple-choice" | "clarifying">("multiple-choice");
  const MAX_FOLLOWUP_ROUNDS = 2; // Limit to 2 rounds of follow-up questions

  useEffect(() => {
    // Fetch initial questions from AI
    const fetchQuestions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/questions/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resume: resume.text,
            jobDescription: jobDescription.text,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.details || errorData.error || "Failed to generate questions");
        }

        const data = await response.json();
        if (!data.questions || data.questions.length === 0) {
          throw new Error("No questions were generated. Please check your API key configuration.");
        }
        setQuestions(data.questions);
      } catch (error) {
        console.error("Error fetching questions:", error);
        setError(error instanceof Error ? error.message : "Failed to generate questions");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [resume, jobDescription]);

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = async () => {
    if (phase === "multiple-choice") {
      // Save the multiple choice answer
      const currentQuestion = questions[currentQuestionIndex];
      const currentAnswer = answers[currentQuestion.id] || "";
      
      if (currentQuestionIndex < questions.length - 1) {
        // Move to next multiple choice question
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        // All 3 multiple choice questions answered, generate clarifying questions
        const allMCAnswers = { ...answers };
        setMultipleChoiceAnswers(allMCAnswers);
        
        // Generate clarifying questions for each multiple choice answer
        setIsLoading(true);
        const newClarifyingQuestions: Question[] = [];
        const clarifyingMap: Record<string, string> = {};
        
        // Generate clarifying questions for each multiple choice answer sequentially
        for (const question of questions) {
          const answer = allMCAnswers[question.id];
          if (answer) {
            try {
              const response = await fetch("/api/questions/followup", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  resume: resume.text,
                  jobDescription: jobDescription.text,
                  questionText: question.question,
                  selectedAnswer: answer,
                  answers: Object.entries(allMCAnswers).map(([qId, ans]) => ({
                    questionId: qId,
                    answer: ans,
                  })),
                }),
              });

              if (response.ok) {
                const data = await response.json();
                if (data.questions && data.questions.length > 0) {
                  // Add clarifying questions and map them to the MC answer
                  for (const clarifyingQ of data.questions) {
                    newClarifyingQuestions.push(clarifyingQ);
                    clarifyingMap[clarifyingQ.id] = answer; // Map clarifying Q to the MC answer
                  }
                }
              }
            } catch (error) {
              console.error("Error generating clarifying questions:", error);
            }
          }
        }
        
        setIsLoading(false);
        
        if (newClarifyingQuestions.length > 0) {
          // Add clarifying questions to the main questions array
          setQuestions((prev) => [...prev, ...newClarifyingQuestions]);
          setClarifyingQuestionMap(clarifyingMap);
          // Move to clarifying questions phase
          setPhase("clarifying");
          setCurrentQuestionIndex(questions.length); // Start after the multiple choice questions
        } else {
          // No clarifying questions, move to suggestions
          const answerArray: Answer[] = Object.entries(allMCAnswers).map(
            ([questionId, answer]) => ({ questionId, answer })
          );
          if (typeof window !== "undefined") {
            sessionStorage.setItem("answers", JSON.stringify(answerArray));
          }
          onComplete(answerArray);
        }
      }
    } else {
      // Clarifying questions phase
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        // All questions answered, move to suggestions
        const allAnswers = { ...answers };
        const answerArray: Answer[] = Object.entries(allAnswers).map(
          ([questionId, answer]) => ({ questionId, answer })
        );
        if (typeof window !== "undefined") {
          sessionStorage.setItem("answers", JSON.stringify(answerArray));
        }
        onComplete(answerArray);
      }
    }
  };

  const handleSkipToSuggestions = () => {
    // Allow user to skip remaining questions and go to suggestions
    const answerArray: Answer[] = Object.entries(answers).map(
      ([questionId, answer]) => ({ questionId, answer })
    );
    if (typeof window !== "undefined") {
      sessionStorage.setItem("answers", JSON.stringify(answerArray));
    }
    onComplete(answerArray);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Generating questions...</p>
      </div>
    );
  }

  if (error || (questions.length === 0 && !isLoading)) {
    const isQuotaError = error?.includes("quota") || error?.includes("429");
    const isModelError = error?.includes("does not exist") || error?.includes("404");
    
    return (
      <div className="text-center py-12 space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            {isQuotaError ? "API Quota Exceeded" : isModelError ? "Model Access Issue" : "API Key Required"}
          </h3>
          <p className="text-yellow-800 mb-4">
            {error || "To generate AI-powered questions, you need to configure your AI API key."}
          </p>
          {isQuotaError && (
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-left">
              <p className="text-sm text-red-800">
                <strong>Your OpenAI quota has been exceeded.</strong> You can either:
              </p>
              <ul className="list-disc list-inside mt-2 text-sm text-red-700 space-y-1">
                <li>Add billing information to your OpenAI account at <a href="https://platform.openai.com/account/billing" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com/account/billing</a></li>
                <li>Switch to Anthropic Claude (see Option 2 below)</li>
                <li>Wait for your quota to reset (if on a free tier)</li>
              </ul>
            </div>
          )}
          <div className="text-sm text-yellow-700 text-left bg-yellow-100 p-4 rounded mb-4">
            <p className="font-medium mb-2">To fix this, choose one:</p>
            <div className="space-y-3">
              <div>
                <p className="font-medium">Option 1: OpenAI (Recommended - easier to get started)</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com</a></li>
                  <li>Add to <code className="bg-yellow-200 px-1 rounded">.env.local</code>:</li>
                </ol>
                <pre className="mt-1 bg-yellow-200 p-2 rounded text-xs overflow-x-auto">
{`AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here`}
                </pre>
              </div>
              <div>
                <p className="font-medium">Option 2: Anthropic Claude</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com</a></li>
                  <li>Add to <code className="bg-yellow-200 px-1 rounded">.env.local</code>:</li>
                </ol>
                <pre className="mt-1 bg-yellow-200 p-2 rounded text-xs overflow-x-auto">
{`AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_key_here`}
                </pre>
              </div>
            </div>
            <p className="mt-3 font-medium">3. Restart your dev server</p>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Go Back
            </button>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                // Retry fetching questions
                const fetchQuestions = async () => {
                  try {
                    const response = await fetch("/api/questions/generate", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        resume: resume.text,
                        jobDescription: jobDescription.text,
                      }),
                    });

                    if (!response.ok) {
                      const errorData = await response.json().catch(() => ({}));
                      throw new Error(errorData.details || errorData.error || "Failed to generate questions");
                    }

                    const data = await response.json();
                    if (!data.questions || data.questions.length === 0) {
                      throw new Error("No questions were generated. Please check your API key configuration.");
                    }
                    setQuestions(data.questions);
                    setError(null);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to generate questions");
                  } finally {
                    setIsLoading(false);
                  }
                };
                fetchQuestions();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? (answers[currentQuestion.id] || "") : "";
  
  if (!currentQuestion) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading questions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-900">
          Step 3: Answer Questions
        </h2>
        <button
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {phase === "multiple-choice" 
              ? `Question ${currentQuestionIndex + 1} of 3`
              : `Clarifying Question ${currentQuestionIndex - 2} of ${questions.length - 3}`
            }
          </span>
          <div className="w-32 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: phase === "multiple-choice"
                  ? `${((currentQuestionIndex + 1) / 3) * 100}%`
                  : `${((currentQuestionIndex - 2) / Math.max(questions.length - 3, 1)) * 100}%`,
              }}
            ></div>
          </div>
        </div>
        {phase === "clarifying" && currentQuestion && clarifyingQuestionMap[currentQuestion.id] && (
          <div className="text-xs text-gray-500 mt-1 bg-blue-50 p-2 rounded">
            <span className="font-medium">Clarifying:</span> "{clarifyingQuestionMap[currentQuestion.id]}"
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {currentQuestion.question}
        </h3>

        {currentQuestion.type === "textarea" ? (
          <textarea
            value={currentAnswer}
            onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Type your answer here..."
          />
        ) : currentQuestion.type === "multiple-choice" && currentQuestion.options ? (
          <div className="space-y-2">
            {currentQuestion.options.map((option) => (
              <label
                key={option}
                className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="radio"
                  name={currentQuestion.id}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                  className="mr-3"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        ) : (
          <input
            type="text"
            value={currentAnswer}
            onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Type your answer here..."
          />
        )}
      </div>

      <div className="flex gap-4 items-center justify-between">
        <div className="flex gap-4">
          {currentQuestionIndex > 0 && (
            <button
              onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Previous
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!currentAnswer.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentQuestionIndex < questions.length - 1 ? "Next" : "Next Question"}
          </button>
        </div>
        <button
          onClick={handleSkipToSuggestions}
          className="px-4 py-2 border border-gray-400 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
          title="Skip remaining questions and go to suggestions"
        >
          Skip to Suggestions
        </button>
      </div>
    </div>
  );
}
