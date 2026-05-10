# AIIC Web Project TODO

## Project Goal

Build a simple web application that includes at least one chat window where users can talk with a large language model.

The client requirements are not finalized yet, so the project should stay lightweight, modular, and easy to change.

todo：

3h rest

10~12 搭建网站框架，连API

13~18 添加具体功能，设计prompt，UI美术 

19~21 测试+调试

22~24 demo视频+文档

## Confirm With Client

- Target users and usage scenario
- Whether login/account features are required
- Which model provider to use: OpenAI, Alibaba Cloud, local model, or another API
- Whether multimodal input is required: text only, image upload, audio upload, or video
- Whether chat history needs to be saved
- Whether the page needs a custom brand style, logo, or color theme
- Required deployment domain name
- Expected demo date and final delivery date

## Minimum Viable Version

- Single web page
- Chat message list
- Text input box
- Send button
- Loading state while waiting for model response
- Error message when the model API fails
- Basic responsive layout for desktop and mobile
- Backend API endpoint to safely call the model provider

## Possible Future Features

- Image upload for multimodal conversation
- Audio recording or audio upload
- Markdown rendering for model replies
- Streaming responses
- Chat session history
- Export chat record
- Admin configuration page
- User login
- Database storage
- File upload and retrieval augmented generation
- Custom prompt presets

## Suggested Tech Stack

- Frontend: React or Next.js
- Backend: Node.js/Express, Next.js API routes, or Python/FastAPI
- Deployment: Ubuntu 22.04 server on Alibaba Cloud
- Reverse proxy: Nginx
- Process manager: PM2 or systemd
- HTTPS: Certbot after domain binding

## Deployment Notes

- Server public IP: 39.105.114.73
- Server private IP: 172.24.238.231
- Operating system: Ubuntu 22.04
- Model API base URL: `https://geek.tm2.xin/v1`
- Put the model API key in `MODEL_API_KEY` inside the server environment or `.env`
- Keep API keys only in environment variables or `.env` files
- Never expose model provider API keys in frontend code

## Next Steps

- Choose initial tech stack
- Create frontend chat UI
- Create backend chat API
- Add environment variable support for model API key
- Confirm model name and request format for `https://geek.tm2.xin/v1`
- Test locally
- Upload project to server
- Configure Nginx
- Run the app as a persistent service
- Bind domain name when available
- Enable HTTPS
