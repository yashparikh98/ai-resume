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
    const prompt = `You are an expert resume strategist helping someone tailor their resume for a job application.

STEP 1: Analyze the job description and determine what an IDEAL candidate's resume would look like for this role. Consider:
- Key skills, technologies, and qualifications required
- Experience level and years needed
- Industry-specific knowledge
- Soft skills and competencies
- Education and certifications
- Achievements and metrics that would impress

STEP 2: Analyze the provided resume to understand:
- Where the candidate is a STRONG fit (existing skills/experience that match)
- Where there are GAPS (missing skills, experience, or qualifications)
- What would make this candidate a BETTER fit for the role

STEP 3: Based on your analysis, generate exactly 3 strategic multiple-choice questions that will help you understand:
- What accomplishments, projects, or experiences the candidate has that aren't clearly shown in the resume
- What skills or experiences they might have that could bridge gaps
- What achievements or metrics they could highlight to better match the ideal candidate profile

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

IMPORTANT: 
- All 3 questions must be multiple-choice type with 3-5 options each
- Questions should focus on discovering hidden strengths or experiences that could improve fit
- Don't just ask generic questions - make them strategic based on the gap analysis

Return your questions as a JSON array where each question has:
- id: a unique identifier
- question: the question text
- type: "multiple-choice" (must be multiple-choice)
- options: array of 3-5 option strings

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
    answers: Answer[],
    questionText?: string,
    selectedAnswer?: string
  ): Promise<Question[]> {
    // If questionText and selectedAnswer are provided, generate clarifying questions for that specific answer
    if (questionText && selectedAnswer) {
      const prompt = `You are analyzing a candidate's answer to understand how to better tailor their resume for a job.

CONTEXT:
- You've analyzed the job description and identified what an ideal candidate would look like
- You've analyzed the resume to find gaps and strengths
- The candidate just answered a strategic question about their experience

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

MULTIPLE CHOICE QUESTION:
${questionText}

CANDIDATE'S ANSWER:
${selectedAnswer}

Generate 1-2 clarifying follow-up questions that will help you:
- Understand specific accomplishments, metrics, or achievements related to their answer
- Discover details about their experience that could bridge gaps between their resume and the ideal candidate profile
- Get concrete examples or projects that demonstrate their fit for the role

These should be open-ended (text or textarea type) to get detailed, specific information.

Return your questions as a JSON array where each question has:
- id: a unique identifier
- question: the question text
- type: "text" or "textarea"
- options: (not needed for text/textarea)

Return ONLY valid JSON, no other text. If no clarifying questions are needed, return an empty array.`;

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
          return [];
        }
      } catch (error) {
        console.error("Error generating follow-up questions:", error);
        return [];
      }
    }

    // Original logic for general follow-up questions (fallback)
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

    const prompt = `You are an expert resume strategist helping someone tailor their resume for a specific job.

STEP 1: Analyze the job description and determine what an IDEAL candidate's resume would look like for this role.
- What are the key skills, technologies, qualifications, and experience required?
- What achievements, metrics, or accomplishments would impress the hiring manager?
- What industry knowledge, certifications, or education would be expected?

STEP 2: Analyze the provided resume to understand:
- Where the candidate is a STRONG fit (existing skills/experience that match the ideal profile)
- Where there are GAPS (missing skills, experience, qualifications compared to ideal)
- What unique strengths or experiences the candidate has that could be better highlighted

STEP 3: Review the candidate's answers to understand:
- What additional accomplishments, projects, or experiences they have
- What skills or experiences they mentioned that aren't in the resume
- What achievements or metrics they could highlight

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S ANSWERS:
${answersText}

STEP 4: Generate strategic suggestions that:
- Bridge gaps between the resume and ideal candidate profile
- Better highlight existing strengths that match the job
- Incorporate information from the candidate's answers
- Use keywords from the job description NATURALLY (don't just copy-paste)
- Make the candidate appear as a better fit for the role

CRITICAL: 
- Do NOT just copy text from the job description into the resume
- Focus on how the candidate's ACTUAL experience and skills align with the job
- Suggestions should be based on the candidate's real background, not fabricated content
- Use natural language that reflects the candidate's actual experience level and style

For each suggestion, provide:
1. Type: "add" (add new content based on candidate's answers), "remove" (remove unnecessary content), "emphasize" (highlight existing content), or "reword" (rewrite existing content to better match)
2. Section: which section of the resume (e.g., "Experience", "Skills", "Summary")
3. Current text: (if applicable) the current text that should be changed
4. Suggested text: (if applicable) the suggested new text - must be based on candidate's actual experience
5. Reason: why this change will help bridge gaps or better match the ideal candidate profile

Return your suggestions as a JSON array where each suggestion has:
- id: a unique identifier
- type: "add" | "remove" | "emphasize" | "reword"
- section: (optional) the resume section
- currentText: (optional) current text to change
- suggestedText: (optional) suggested new text (must reflect candidate's actual experience)
- reason: explanation of why this suggestion improves fit

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

    const prompt = `You are creating a curated resume that bridges the gap between the candidate's actual experience and what an ideal candidate would look like for this role.

STRATEGIC APPROACH:
1. Understand what an ideal candidate's resume would look like based on the job description
2. Identify where the candidate is a strong fit and where there are gaps
3. Use the candidate's answers to discover hidden strengths and experiences
4. Apply suggestions that improve fit while staying true to the candidate's actual background

ORIGINAL RESUME:
${truncatedResume}

JOB DESCRIPTION:
${truncatedJd}

ACCEPTED SUGGESTIONS:
${suggestionsText}

CANDIDATE'S ANSWERS:
${answersText}

Create a complete, well-formatted resume that:
1. Incorporates all accepted suggestions strategically
2. Emphasizes the candidate's ACTUAL experience and skills that match the job
3. Uses keywords from the job description NATURALLY (don't just copy-paste JD text)
4. Highlights accomplishments and experiences from the candidate's answers
5. Bridges gaps by better showcasing existing strengths, not by fabricating content
6. Maintains professional formatting and the candidate's authentic voice
7. Makes the candidate appear as a strong fit based on their real background

CRITICAL: 
- Base all content on the candidate's ACTUAL experience from their resume and answers
- Do NOT copy text directly from the job description
- Use natural language that reflects the candidate's experience level
- Focus on how their real skills and experience align with the role

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
