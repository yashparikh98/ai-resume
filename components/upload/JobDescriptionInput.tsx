"use client";

import { useState } from "react";
import { JobDescription } from "@/types";

interface JobDescriptionInputProps {
  onSubmit: (jd: JobDescription) => void;
  onBack: () => void;
}

export function JobDescriptionInput({ onSubmit, onBack }: JobDescriptionInputProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError("Please enter a job description URL");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/jd/fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch job description");
      }

      const data = await response.json();
      onSubmit(data.jobDescription);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch job description");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-900">
          Step 2: Enter Job Description
        </h2>
        <button
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="jd-url"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Job Description URL
          </label>
          <input
            id="jd-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/job-posting"
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
          <p className="mt-2 text-sm text-gray-500">
            Paste the URL of the job posting you're applying for
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Fetching..." : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
