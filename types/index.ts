export interface Resume {
  id: string;
  text: string;
  fileName: string;
  uploadedAt: Date;
}

export interface JobDescription {
  url: string;
  text: string;
  title?: string;
  company?: string;
  fetchedAt: Date;
}

export interface Question {
  id: string;
  question: string;
  type: 'text' | 'textarea' | 'multiple-choice';
  options?: string[];
}

export interface Answer {
  questionId: string;
  answer: string;
}

export interface Suggestion {
  id: string;
  type: 'add' | 'remove' | 'emphasize' | 'reword';
  section?: string;
  currentText?: string;
  suggestedText?: string;
  reason: string;
}

export interface ConversationState {
  step: 'upload' | 'jd' | 'questions' | 'suggestions' | 'review' | 'generate';
  resume?: Resume;
  jobDescription?: JobDescription;
  questions: Question[];
  answers: Answer[];
  suggestions: Suggestion[];
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}
