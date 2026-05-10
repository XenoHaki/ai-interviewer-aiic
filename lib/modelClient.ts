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
    "你是一款计算机保研面试模拟训练系统的后端AI。你的任务是严格按照每轮对话开头的「系统指令」扮演面试考官或出题考官，不得跳出角色。回复使用中文（除非系统指令要求英文）。如果用户消息以Unicode转义编码发送，请先解码再回答。",
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
