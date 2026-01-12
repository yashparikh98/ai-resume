"use client";

import { useState, useEffect } from "react";
import { Resume, JobDescription, Answer, Suggestion } from "@/types";

interface SuggestionsViewProps {
  resume: Resume;
  jobDescription: JobDescription;
  answers: Answer[];
  onAccept: (suggestionId: string) => void;
}

export function SuggestionsView({
  resume,
  jobDescription,
  answers,
  onAccept,
}: SuggestionsViewProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        console.log("Fetching suggestions with answers:", answers);
        const response = await fetch("/api/suggestions/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resume: resume.text,
            jobDescription: jobDescription.text,
            answers,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.details || errorData.error || "Failed to generate suggestions";
          console.error("Suggestions API error:", errorMsg);
          throw new Error(errorMsg);
        }

        const data = await response.json();
        console.log("Received suggestions:", data.suggestions);
        if (!data.suggestions || data.suggestions.length === 0) {
          console.warn("No suggestions returned from API");
        }
        setSuggestions(data.suggestions || []);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        // Show error to user
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [resume, jobDescription, answers]);

  const handleAccept = (suggestionId: string) => {
    setAcceptedSuggestions((prev) => new Set(prev).add(suggestionId));
    onAccept(suggestionId);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Analyzing and generating suggestions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Step 4: Review Suggestions
      </h2>

      {suggestions.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-gray-600">No suggestions were generated.</p>
          {answers.length > 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your {answers.length} answer{answers.length !== 1 ? 's' : ''} {answers.length === 1 ? 'was' : 'were'} included in the analysis.
              </p>
              <p className="text-sm text-blue-700 mt-2">
                This might be due to an API error or the AI couldn't generate suggestions. Please try again or check your API configuration.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> No answers were provided. Suggestions are generated based on your resume, job description, and your answers to clarifying questions.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className={`border rounded-lg p-6 ${
                acceptedSuggestions.has(suggestion.id)
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      suggestion.type === "add"
                        ? "bg-green-100 text-green-800"
                        : suggestion.type === "remove"
                        ? "bg-red-100 text-red-800"
                        : suggestion.type === "emphasize"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {suggestion.type.toUpperCase()}
                  </span>
                  {suggestion.section && (
                    <span className="text-sm text-gray-500">
                      {suggestion.section}
                    </span>
                  )}
                </div>
                {acceptedSuggestions.has(suggestion.id) && (
                  <span className="text-sm text-green-600 font-medium">
                    ✓ Accepted
                  </span>
                )}
              </div>

              <p className="text-gray-700 mb-3">{suggestion.reason}</p>

              {suggestion.currentText && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Current:
                  </p>
                  <p className="text-sm text-gray-800 bg-gray-50 p-2 rounded">
                    {suggestion.currentText}
                  </p>
                </div>
              )}

              {suggestion.suggestedText && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Suggested:
                  </p>
                  <p className="text-sm text-gray-800 bg-blue-50 p-2 rounded">
                    {suggestion.suggestedText}
                  </p>
                </div>
              )}

              {!acceptedSuggestions.has(suggestion.id) && (
                <button
                  onClick={() => handleAccept(suggestion.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Accept Suggestion
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-4 pt-6 border-t">
        <button
          onClick={() => {
            // Save data to sessionStorage for the generate page
            // Only include accepted suggestions
            const acceptedSuggestionsList = suggestions.filter((s) =>
              acceptedSuggestions.has(s.id)
            );
            if (typeof window !== "undefined") {
              sessionStorage.setItem("resume", JSON.stringify(resume));
              sessionStorage.setItem("jobDescription", JSON.stringify(jobDescription));
              sessionStorage.setItem("suggestions", JSON.stringify(acceptedSuggestionsList));
              sessionStorage.setItem("answers", JSON.stringify(answers));
            }
            // Navigate to review/generate step
            window.location.href = "/generate";
          }}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Generate Curated Resume
        </button>
      </div>
    </div>
  );
}
