"use client";

import { useState, useRef } from "react";
import { Resume } from "@/types";
import * as pdfjsLib from "pdfjs-dist";

// Configure pdfjs worker for client-side
if (typeof window !== "undefined") {
  // Use local worker file from public folder
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

interface ResumeUploadProps {
  onUpload: (resume: Resume) => void;
}

export function ResumeUpload({ onUpload }: ResumeUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsePDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += pageText + "\n";
      }

      return fullText.trim();
    } catch (err) {
      throw new Error(`Failed to parse PDF: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.includes("pdf") && !file.type.includes("word") && !file.name.endsWith(".docx")) {
      setError("Please upload a PDF or DOCX file");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      let resumeText: string;
      let fileName = file.name;

      // Parse PDF on client side
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        resumeText = await parsePDF(file);
      } else {
        // For DOCX, send to server
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/resume/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error || errorData.details || "Failed to upload resume";
          const suggestion = errorData.suggestion || "";
          throw new Error(suggestion ? `${errorMsg}\n\n${suggestion}` : errorMsg);
        }

        const data = await response.json();
        onUpload(data.resume);
        return;
      }

      // Create resume object from parsed PDF text
      if (!resumeText.trim()) {
        throw new Error("Could not extract text from the PDF file");
      }

      const resume: Resume = {
        id: crypto.randomUUID(),
        text: resumeText,
        fileName: fileName,
        uploadedAt: new Date(),
      };

      onUpload(resume);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload resume");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Step 1: Upload Your Resume
      </h2>

      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="space-y-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Choose File"}
            </button>
            <p className="mt-2 text-sm text-gray-600">
              or drag and drop your resume here
            </p>
          </div>

          <p className="text-xs text-gray-500">
            PDF or DOCX files only (max 10MB)
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800 whitespace-pre-line">{error}</p>
          {error.includes("DOCX") && (
            <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-800 font-medium mb-1">Quick Solution:</p>
              <p className="text-sm text-blue-700">
                Convert your PDF to DOCX using{" "}
                <a href="https://www.ilovepdf.com/pdf_to_word" target="_blank" rel="noopener noreferrer" className="underline">
                  iLovePDF
                </a>
                {" or "}
                <a href="https://www.zamzar.com/convert/pdf-to-docx/" target="_blank" rel="noopener noreferrer" className="underline">
                  Zamzar
                </a>
                , then upload the DOCX file.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
