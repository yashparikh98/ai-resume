# AI Resume Curator

An AI-powered application that helps users curate their resumes for specific job descriptions. The app analyzes resumes, asks clarifying questions, and provides suggestions to tailor resumes for job applications.

## Features

- 📄 **Resume Upload**: Upload PDF or DOCX resumes
- 🔗 **Job Description Input**: Paste job posting URLs
- ❓ **Interactive Q&A**: AI asks clarifying questions about your experience
- 💡 **Smart Suggestions**: Get AI-powered recommendations to improve your resume
- ✨ **Resume Generation**: Generate a curated resume tailored to the job

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **AI Integration** - OpenAI/Anthropic (to be configured)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
cd /Users/yashparikh/projects/ai-resume
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
# Anthropic API Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# AI Provider (use "anthropic" for Claude)
AI_PROVIDER=anthropic

# AI Model (Claude Opus)
# Options: claude-3-opus-20240229, claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022
AI_MODEL=claude-3-opus-20240229
```

**To get your Anthropic API key:**
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy it to your `.env.local` file

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ai-resume/
├── app/                    # Next.js App Router
│   ├── api/            # API routes
│   │   ├── resume/     # Resume upload & parsing
│   │   ├── jd/         # Job description fetching
│   │   ├── questions/  # Question generation
│   │   └── suggestions/# Suggestion generation
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # React components
│   ├── upload/         # Upload components
│   ├── qa/             # Q&A flow components
│   └── suggestions/    # Suggestion components
├── lib/                # Utility libraries
│   └── ai/             # AI client integration
├── types/              # TypeScript type definitions
└── public/             # Static assets
```

## Next Steps

### To Complete the Implementation:

1. **Install PDF/DOCX parsing libraries**:
```bash
npm install pdf-parse mammoth
```

2. **Set up AI Integration**:
   - Add OpenAI SDK: `npm install openai`
   - Or Anthropic SDK: `npm install @anthropic-ai/sdk`
   - Update `/lib/ai/client.ts` with actual API calls

3. **Improve Job Description Parsing**:
   - Install cheerio or jsdom for better HTML parsing
   - Add support for LinkedIn, Indeed, etc.

4. **Add Resume Generation**:
   - Create API route for generating final resume
   - Add PDF generation capability
   - Implement download functionality

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

### Deploy to Vercel

1. **Push to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Set Environment Variables** in Vercel:
   - Go to Project Settings → Environment Variables
   - Add these variables:
     ```
     AI_PROVIDER=anthropic
     ANTHROPIC_API_KEY=your_key_here
     AI_MODEL=claude-3-haiku-20240307
     ```
   - Or if using OpenAI:
     ```
     AI_PROVIDER=openai
     OPENAI_API_KEY=your_key_here
     AI_MODEL=gpt-3.5-turbo
     ```

4. **Redeploy** after adding environment variables

## License

MIT
