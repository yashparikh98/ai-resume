"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Resume, JobDescription, Suggestion, Answer } from "@/types";

function GenerateContent() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [curatedResume, setCuratedResume] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // In a real app, you'd get these from state management or API
  // For now, we'll fetch from localStorage or API
  const [resume, setResume] = useState<Resume | null>(null);
  const [jobDescription, setJobDescription] = useState<JobDescription | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);

  useEffect(() => {
    // Load data from sessionStorage or fetch from API
    const resumeData = sessionStorage.getItem("resume");
    const jdData = sessionStorage.getItem("jobDescription");
    const suggestionsData = sessionStorage.getItem("suggestions");
    const answersData = sessionStorage.getItem("answers");

    if (resumeData) setResume(JSON.parse(resumeData));
    if (jdData) setJobDescription(JSON.parse(jdData));
    if (suggestionsData) setSuggestions(JSON.parse(suggestionsData));
    if (answersData) setAnswers(JSON.parse(answersData));
  }, []);

  const handleGenerate = async () => {
    if (!resume || !jobDescription) {
      setError("Missing resume or job description data");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume: resume.text,
          jobDescription: jobDescription.text,
          suggestions: suggestions, // Already filtered to only accepted ones from sessionStorage
          answers,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errorMsg = data.details || data.error || "Failed to generate resume";
        console.error("Generate error:", data);
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setCuratedResume(data.resume);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate resume");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!curatedResume) return;

    const blob = new Blob([curatedResume], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `curated-resume-${jobDescription?.title || "resume"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!curatedResume) return;

    try {
      await navigator.clipboard.writeText(curatedResume);
      alert("Resume copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  useEffect(() => {
    if (resume && jobDescription && !curatedResume && !isGenerating) {
      handleGenerate();
    }
  }, [resume, jobDescription]);

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Generating Your Curated Resume
          </h2>
          <p className="text-gray-600">
            This may take a minute...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl">
          <div className="text-center">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Error Generating Resume
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Your Curated Resume
          </h1>
          <p className="text-lg text-gray-600">
            Tailored for: {jobDescription?.title || "Job Application"}
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 mb-6">
          <div className="flex justify-end gap-4 mb-6">
            <button
              onClick={handleCopy}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Copy to Clipboard
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Download as TXT
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Start Over
            </button>
          </div>

          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm bg-gray-50 p-6 rounded-lg border border-gray-200">
              {curatedResume || "Generating..."}
            </pre>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            What's Next?
          </h2>
          <ul className="space-y-2 text-gray-600">
            <li>✓ Review the curated resume above</li>
            <li>✓ Copy or download it for your application</li>
            <li>✓ Make any final manual adjustments if needed</li>
            <li>✓ Submit your application with confidence!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    }>
      <GenerateContent />
    </Suspense>
  );
}
