type ModelMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

const systemPrompt: ModelMessage = {
  role: "system",
  content:
    "You are a helpful AI assistant for a web project demo. Answer clearly and concisely. If a user message says it is encoded as JSON Unicode escape sequences, interpret those escape sequences as the original user text before answering.",
};

function toUnicodeEscapes(value: string) {
  return value.replace(/[\u007f-\uffff]/g, (char) => {
    return `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
  });
}

function normalizeMessagesForModel(messages: ModelMessage[]) {
  return messages.map((message) => {
    const escapedContent = toUnicodeEscapes(message.content);

    if (escapedContent === message.content) {
      return message;
    }

    return {
      ...message,
      content: `The user's message is encoded as JSON Unicode escape sequences. Decode it before answering:\n${escapedContent}`,
    };
  });
}

export async function requestModelReply(messages: ModelMessage[]) {
  const baseUrl = process.env.MODEL_BASE_URL;
  const apiKey = process.env.MODEL_API_KEY;
  const model = process.env.MODEL_NAME;

  if (!baseUrl || !apiKey || !model) {
    throw new Error("模型环境变量未配置完整，请检查 MODEL_BASE_URL、MODEL_API_KEY 和 MODEL_NAME。");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [systemPrompt, ...normalizeMessagesForModel(messages)],
      temperature: 0.7,
    }),
  });

  const data = (await response.json()) as ChatCompletionResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || `模型接口请求失败：${response.status}`);
  }

  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error("模型返回为空，请检查模型名称或接口配置。");
  }

  return reply;
}
