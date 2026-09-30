# SIH26154 Content Transformation — SIH26154 Gen AI Platform for Automated Content Transformation

This ZIP is the **AI content-transformation** SIH26154 Content Transformation implementation for SIH26154.

## Included workflow

1. Supabase email/password login and signup.
2. Upload PDF, document, image, audio or video, or paste a prompt/text source.
3. Image preview before generation.
4. Supabase Storage persistence for the actual source file + database metadata in `content_source_files`.
5. Configurable output selection: Executive Summary, Advisory, Presentation, Infographic, LinkedIn, X/Twitter thread, Video Package.
6. Audience, tone, language, detail, objective and style controls.
7. Shared Truth Layer: facts, entities, events, timeline, topics and uncertainties.
8. Source-grounded transformation using Gemini.
9. AI claim verification: Verified / Unverified / Contradicted + evidence.
10. Cross-output consistency score/issues.
11. AI red-team review.
12. Controlled regeneration of one output from the existing Truth Layer.
13. Human review: approve/reject + reviewer note, persisted in Supabase.
14. Export generated output to a text file.
15. Projects & History page with stored outputs, claim evidence, review status and **actual image previews from Supabase Storage**.
16. Voice dictation for source text where the browser supports SpeechRecognition.
17. **Dedicated AI Voice & Text Chatbot Assistant** (`ChatAssistant`) with project context awareness, modular `speechToTextService` and `textToSpeechService`.
18. **Auto Voice Response**: When the user enters a prompt using voice, the AI response is automatically played back aloud in speech.
19. **In-place Content Editing**: Operators can edit generated outputs directly before human approval sign-off.
20. **Multi-Project Management**: "+ New Project" creates additional project workspaces with unique IDs while preserving all previous projects and data.

## Setup

### 1. Supabase

Create a Supabase project. Open **SQL Editor** and run `supabase/schema.sql`.

The script creates the tables, Row Level Security policies and a private Storage bucket named `SIH26154 Content Transformation-source-files`.

The actual uploaded image/PDF/audio/video is stored in Supabase Storage. The `content_source_files` table stores its metadata and storage path. The History page creates a signed URL to display private images. This is the normal Supabase architecture for binary files rather than putting the binary itself into a database row.

### 2. Environment

The project includes `.env` with placeholders. Fill in:

```env
VITE_SUPABASE_URL="https://YOUR-PROJECT-ID.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"
AGENTIC_AI_PROVIDER="gemini"
AGENTIC_AI_API_KEY="YOUR_AGENTIC_AI_KEY"
AGENTIC_AI_MODEL="gemini-3.8-flash"
GEMINI_API_KEY=""
GOOGLE_API_KEY=""
PORT="3000"
```

For Gemini, you can use the same key for `AGENTIC_AI_API_KEY`, `GEMINI_API_KEY` or `GOOGLE_API_KEY`. Keep Gemini and Supabase service-role secrets server-side; never put them in `VITE_*` variables.

### 3. Install and run

```bash
npm install --legacy-peer-deps
npm run dev
```

Open `http://localhost:3000`.

### 4. Supabase Auth

For a quick demo, you may disable email confirmation in Supabase Auth settings. If confirmation remains enabled, signup tells the user to confirm the email before signing in.

## Agentic AI options noted in `.env`

- Google Gemini API / Gemini Interactions API — implemented provider.
- OpenAI Responses API / Agents SDK — adapter option.
- Anthropic Claude API / Claude Agent SDK — adapter option.

## Security

Do not commit `.env` with real keys. Rotate any API key that has been exposed publicly. The Gemini call is performed on the Node server so the agentic key is not bundled into the React client.
