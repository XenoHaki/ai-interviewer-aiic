# AI Interviewer AIIC

AI Interviewer AIIC is a lightweight web product for computer science students preparing for recommendation-based graduate interviews. It provides an AI interviewer workflow with interview training, interviewer settings, interview records, file upload entry points, and light/dark themes.

## Features

- LLM-style web interface
- Collapsible left sidebar navigation
- Home, interview training, interviewer profile, and interview records sections
- AI interview chat backed by an OpenAI-compatible API
- Interviewer settings for pressure level, professional direction, English interview mode, and focus areas
- Image/document upload entry points for future multimodal expansion
- Recent interview record list, keeping the latest 10 sessions in the current browser session
- Light/dark theme toggle with persisted browser preference
- Local fallback interviewer response when the upstream model service is temporarily unavailable

## Tech Stack

- Next.js
- React
- TypeScript
- lucide-react
- Nginx reverse proxy on Ubuntu 22.04
- PM2 process manager

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` from `.env.example` and fill in your API configuration:

```env
MODEL_BASE_URL=https://geek.tm2.xin/v1
MODEL_API_KEY=your_api_key
MODEL_NAME=your_model_name
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Start production server:

```bash
npm run start
```

## Environment Variables

- `MODEL_BASE_URL`: OpenAI-compatible API base URL
- `MODEL_API_KEY`: server-side model API key
- `MODEL_NAME`: model identifier

Do not expose real API keys in frontend code or commit `.env.local`.

## Deployment Notes

Current deployment uses:

- Alibaba Cloud ECS
- Ubuntu 22.04
- Nginx reverse proxy from port `80` to local Next.js port `3000`
- PM2 process name: `aiicproject`

Useful server commands:

```bash
pm2 status
pm2 logs aiicproject
pm2 restart aiicproject
systemctl reload nginx
```

## Project Documents

- `todo.md`: running project checklist
- `docs/user-painpoint-research.md`: user pain point research
- `plans.md`: early product planning notes
- `2026-05-09_项目挑战说明.pdf`: original challenge brief
