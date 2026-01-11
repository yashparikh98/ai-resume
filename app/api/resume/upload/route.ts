import { NextRequest, NextResponse } from "next/server";
import { Resume } from "@/types";
import mammoth from "mammoth";
import pdfParse from "@/lib/parsers/pdf";

// Configure route for Vercel
export const runtime = "nodejs";
export const maxDuration = 30; // 30 seconds for file processing

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let resumeText = "";

    // Parse based on file type
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      // Parse PDF - handle different pdf-parse versions
      let pdfData;
      try {
        // Check if pdfParse is available
        if (!pdfParse || (typeof pdfParse !== "function" && !pdfParse.PDFParse)) {
          throw new Error("PDF parsing library not available. This may be a serverless environment issue.");
        }

        // Try calling as function first (older versions)
        if (typeof pdfParse === "function") {
          pdfData = await pdfParse(buffer);
        } else if (pdfParse.PDFParse) {
          // Use PDFParse class (newer versions)
          const PDFParseClass = pdfParse.PDFParse;
          const parser = new PDFParseClass({ data: buffer });
          const result = await parser.getText();
          pdfData = { text: result.text || result };
        } else {
          // Try as module.exports
          const parseFn = pdfParse.default || pdfParse;
          if (typeof parseFn === "function") {
            pdfData = await parseFn(buffer);
          } else {
            throw new Error("Could not find PDF parsing function");
          }
        }
        resumeText = pdfData.text || String(pdfData);
      } catch (parseError) {
        console.error("PDF parsing error:", parseError);
        const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
        throw new Error(`Failed to parse PDF: ${errorMsg}. If this persists, try uploading a DOCX file instead.`);
      }
    } else if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      // Parse DOCX
      const result = await mammoth.extractRawText({ buffer });
      resumeText = result.value;
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF or DOCX file." },
        { status: 400 }
      );
    }

    if (!resumeText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from the file" },
        { status: 400 }
      );
    }

    const resume: Resume = {
      id: crypto.randomUUID(),
      text: resumeText,
      fileName: file.name,
      uploadedAt: new Date(),
    };

    return NextResponse.json({ resume });
  } catch (error) {
    console.error("Error uploading resume:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", { errorMessage, errorStack });
    return NextResponse.json(
      { 
        error: "Failed to upload resume",
        details: errorMessage,
        stack: process.env.NODE_ENV === "development" ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}
