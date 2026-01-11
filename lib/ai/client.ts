// AI Client configuration - supports both OpenAI and Anthropic
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Question, Suggestion, Answer } from "@/types";

export interface AIConfig {
  provider: "openai" | "anthropic" | "custom";
  apiKey?: string;
  model?: string;
}

export class AIClient {
  private config: AIConfig;
  private anthropic: Anthropic | null = null;
  private openai: OpenAI | null = null;

  constructor(config: AIConfig) {
    this.config = config;
    
    if (config.provider === "anthropic" && config.apiKey) {
      this.anthropic = new Anthropic({
        apiKey: config.apiKey,
      });
    } else if (config.provider === "openai" && config.apiKey) {
      this.openai = new OpenAI({
        apiKey: config.apiKey,
      });
    }
  }

  private async callAI(prompt: string, maxTokens: number = 2000): Promise<string> {
    if (this.config.provider === "openai" && this.openai) {
      try {
        const response = await this.openai.chat.completions.create({
          model: this.config.model || "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        });

        return response.choices[0]?.message?.content || "";
      } catch (error: any) {
        // Provide more helpful error messages
        if (error?.status === 429) {
          throw new Error("429 You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.");
        }
        if (error?.status === 401) {
          throw new Error("Invalid API key. Please check your OPENAI_API_KEY in .env.local");
        }
        throw error;
      }
    } else if (this.config.provider === "anthropic" && this.anthropic) {
      const modelName = this.config.model || "claude-3-opus-20240229";
      console.log("Using Anthropic model:", modelName);
      console.log("API Key present:", !!this.config.apiKey);
      
      const message = await this.anthropic.messages.create({
        model: modelName,
        max_tokens: maxTokens,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type === "text") {
        return content.text;
      }
      return "";
    }

    throw new Error(
      `AI client not initialized. Please set ${this.config.provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"}.`
    );
  }

  async generateQuestions(
    resume: string,
    jobDescription: string
  ): Promise<Question[]> {
    const prompt = `You are a helpful AI assistant helping someone tailor their resume for a job application.

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

Based on the resume and job description above, generate 3-5 clarifying questions that will help you better understand the candidate's experience, accomplishments, and skills. These questions should:
1. Fill gaps between the resume and job requirements
2. Ask about specific accomplishments or metrics
3. Understand relevant experience that might not be clearly stated
4. Clarify technical skills or certifications

Return your questions as a JSON array where each question has:
- id: a unique identifier
- question: the question text
- type: "text", "textarea", or "multiple-choice"
- options: (optional) array of options if type is "multiple-choice"

Return ONLY valid JSON, no other text.`;

    try {
      const response = await this.callAI(prompt, 2000);
      const jsonText = response.trim();
      
      // Extract JSON from markdown code blocks if present
      let jsonString = jsonText;
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       jsonText.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1].trim();
      }
      
      // Try to fix common JSON issues
      jsonString = jsonString.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'); // Remove trailing commas
      
      try {
        const questions = JSON.parse(jsonString);
        return Array.isArray(questions) ? questions : [];
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Attempted to parse:", jsonString.substring(0, 500));
        // Try to extract array from the response
        const arrayMatch = jsonString.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            const questions = JSON.parse(arrayMatch[0]);
            return Array.isArray(questions) ? questions : [];
          } catch (e) {
            console.error("Failed to parse extracted array:", e);
          }
        }
        throw new Error(`Invalid JSON response from AI: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      throw error;
    }
  }

  async generateFollowUpQuestions(
    resume: string,
    jobDescription: string,
    answers: Answer[]
  ): Promise<Question[]> {
    const answersText = answers
      .map((a, idx) => `Question ${idx + 1}: ${a.questionId}\nAnswer: ${a.answer}`)
      .join("\n\n");

    const prompt = `Based on the resume, job description, and previous answers below, determine if you need to ask any follow-up questions to better understand the candidate.

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

PREVIOUS ANSWERS:
${answersText}

IMPORTANT: Only generate follow-up questions if there is CRITICAL information missing that is absolutely necessary to provide good resume suggestions. If you have enough information to provide helpful suggestions, return an empty array.

If you need more information, generate 1-3 additional clarifying questions. Otherwise, return an empty array.

Return your questions as a JSON array where each question has:
- id: a unique identifier
- question: the question text
- type: "text", "textarea", or "multiple-choice"
- options: (optional) array of options if type is "multiple-choice"

Return ONLY valid JSON, no other text.`;

    try {
      const response = await this.callAI(prompt, 2000);
      const jsonText = response.trim();
      
      // Extract JSON from markdown code blocks if present
      let jsonString = jsonText;
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       jsonText.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1].trim();
      }
      
      // Try to fix common JSON issues
      jsonString = jsonString.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'); // Remove trailing commas
      
      try {
        const questions = JSON.parse(jsonString);
        return Array.isArray(questions) ? questions : [];
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Attempted to parse:", jsonString.substring(0, 500));
        // Try to extract array from the response
        const arrayMatch = jsonString.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            const questions = JSON.parse(arrayMatch[0]);
            return Array.isArray(questions) ? questions : [];
          } catch (e) {
            console.error("Failed to parse extracted array:", e);
          }
        }
        // Return empty array for follow-up questions if parsing fails
        return [];
      }
    } catch (error) {
      console.error("Error generating follow-up questions:", error);
      return [];
    }
  }

  async generateSuggestions(
    resume: string,
    jobDescription: string,
    answers: Answer[]
  ): Promise<Suggestion[]> {
    const answersText = answers
      .map((a) => `Q: ${a.questionId}\nA: ${a.answer}`)
      .join("\n\n");

    const prompt = `You are an expert resume reviewer helping someone tailor their resume for a specific job.

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S ANSWERS TO CLARIFYING QUESTIONS:
${answersText}

Analyze the resume against the job description and provide specific, actionable suggestions to improve the resume. For each suggestion, provide:
1. Type: "add" (add new content), "remove" (remove unnecessary content), "emphasize" (highlight existing content), or "reword" (rewrite existing content)
2. Section: which section of the resume (e.g., "Experience", "Skills", "Summary")
3. Current text: (if applicable) the current text that should be changed
4. Suggested text: (if applicable) the suggested new text
5. Reason: why this change will help match the job description

Return your suggestions as a JSON array where each suggestion has:
- id: a unique identifier
- type: "add" | "remove" | "emphasize" | "reword"
- section: (optional) the resume section
- currentText: (optional) current text to change
- suggestedText: (optional) suggested new text
- reason: explanation of why this suggestion helps

Return ONLY valid JSON, no other text.`;

    try {
      const response = await this.callAI(prompt, 4000);
      const jsonText = response.trim();
      
      // Extract JSON from markdown code blocks if present
      let jsonString = jsonText;
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       jsonText.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1].trim();
      }
      
      // Try to fix common JSON issues
      jsonString = jsonString.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'); // Remove trailing commas
      
      try {
        const suggestions = JSON.parse(jsonString);
        return Array.isArray(suggestions) ? suggestions : [];
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Attempted to parse:", jsonString.substring(0, 500));
        // Try to extract array from the response
        const arrayMatch = jsonString.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            const suggestions = JSON.parse(arrayMatch[0]);
            return Array.isArray(suggestions) ? suggestions : [];
          } catch (e) {
            console.error("Failed to parse extracted array:", e);
          }
        }
        throw new Error(`Invalid JSON response from AI: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
    } catch (error) {
      console.error("Error generating suggestions:", error);
      throw error;
    }
  }

  async generateResume(
    originalResume: string,
    jobDescription: string,
    suggestions: Suggestion[],
    answers: Answer[]
  ): Promise<string> {
    // Truncate very long inputs to avoid token limits
    const maxResumeLength = 5000;
    const maxJdLength = 3000;
    const truncatedResume = originalResume.length > maxResumeLength 
      ? originalResume.substring(0, maxResumeLength) + "..."
      : originalResume;
    const truncatedJd = jobDescription.length > maxJdLength
      ? jobDescription.substring(0, maxJdLength) + "..."
      : jobDescription;

    const suggestionsText = suggestions
      .map((s) => `- ${s.type.toUpperCase()}: ${s.reason}${s.suggestedText ? `\n  Suggested: ${s.suggestedText}` : ''}`)
      .join("\n");

    const answersText = answers
      .map((a) => `Q: ${a.questionId}\nA: ${a.answer}`)
      .join("\n\n");

    const prompt = `Generate a curated resume based on the original resume, job description, accepted suggestions, and candidate's answers.

ORIGINAL RESUME:
${truncatedResume}

JOB DESCRIPTION:
${truncatedJd}

ACCEPTED SUGGESTIONS:
${suggestionsText}

CANDIDATE'S ANSWERS:
${answersText}

Create a complete, well-formatted resume that:
1. Incorporates all accepted suggestions
2. Emphasizes relevant experience and skills for this job
3. Uses keywords from the job description naturally
4. Maintains professional formatting
5. Is ready to be used for this specific job application

Return the complete resume text, formatted clearly with sections (Summary, Experience, Education, Skills, etc.).`;

    try {
      console.log("Generating resume with AI...");
      // Claude Haiku has a max of 4096 output tokens, other models can handle more
      const maxTokens = this.config.model?.includes("haiku") ? 4096 : 8000;
      const response = await this.callAI(prompt, maxTokens);
      console.log("Resume generated successfully, length:", response.length);
      return response;
    } catch (error) {
      console.error("Error generating resume:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate resume: ${errorMessage}`);
    }
  }
}

// Export a singleton instance
// Supports both OpenAI and Anthropic
const provider = (process.env.AI_PROVIDER as "openai" | "anthropic" | "custom") || "openai";
const apiKey = provider === "openai" 
  ? (process.env.OPENAI_API_KEY || process.env.AI_API_KEY)
  : (process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY);

const defaultModel = provider === "openai"
  ? (process.env.AI_MODEL || "gpt-3.5-turbo")
  : (process.env.AI_MODEL || "claude-3-opus-20240229");

export const aiClient = new AIClient({
  provider,
  apiKey,
  model: defaultModel,
});
