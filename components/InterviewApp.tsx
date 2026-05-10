"use client";

import {
  BookOpen,
  Bot,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Gauge,
  History,
  Home,
  Image as ImageIcon,
  Loader2,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Send,
  Settings2,
  Upload,
  User,
  X,
} from "lucide-react";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type PageKey = "home" | "training" | "settings" | "records";
type PressureLevel = "friendly" | "normal" | "strict";
type TrainingMode = "project" | "quiz";
type MessageRole = "assistant" | "user";
type ThemeMode = "light" | "dark";

type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
};

type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  attachments?: Attachment[];
};

type InterviewSettings = {
  pressure: PressureLevel;
  direction: string;
  english: boolean;
  englishIntro: boolean;
  focus: string;
  maxRounds: number;
  mode: TrainingMode;
  quizSubject: string;
};

type ReportDimension = {
  name: string;
  score: number;
  comment: string;
};

type InterviewReport = {
  dimensions: ReportDimension[];
  overall: string;
  suggestion: string;
};

type InterviewRecord = {
  id: string;
  title: string;
  createdAt: string;
  summary: string;
  messages: ChatMessage[];
};

const navItems: Array<{ key: PageKey; label: string; icon: typeof Home }> = [
  { key: "home", label: "首页", icon: Home },
  { key: "training", label: "面试训练", icon: MessageSquareText },
  { key: "settings", label: "面试官属性", icon: Settings2 },
  { key: "records", label: "面试记录", icon: History },
];

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "同学你好，我是本次保研模拟面试的面试官。\n\n请先在左侧「面试官属性」中设置专业方向和压力程度，然后：\n- **粘贴**你的项目经历或简历片段\n- 或**上传**你的简历/项目文档\n\n我会根据你的材料连续追问，模拟真实面试场景。准备好了就开始吧！",
  },
];

const quizSubjects = ["数据结构", "机器学习", "操作系统", "计算机网络", "线性代数", "概率论", "高等数学", "计算机系统导论", "算法设计与分析"];

const defaultSettings: InterviewSettings = {
  pressure: "normal",
  direction: "",
  english: false,
  englishIntro: false,
  focus: "",
  maxRounds: 5,
  mode: "project",
  quizSubject: "数据结构",
};

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function pressureLabel(value: PressureLevel) {
  return {
    friendly: "轻松",
    normal: "普通",
    strict: "高压",
  }[value];
}

function buildContext(settings: InterviewSettings, attachments: Attachment[], currentRound: number = 0) {
  const attachmentText = attachments.length
    ? `本轮用户上传了材料：${attachments.map((file) => file.name).join("、")}。如果无法直接读取文件内容，请提醒用户粘贴关键片段。`
    : "本轮用户未上传附件。";
  const maxR = settings.maxRounds ?? 5;
  const wrapUpInstruction = currentRound >= maxR - 1
    ? `\n【重要】这是最后一轮追问（第${currentRound + 1}/${maxR}轮）。请在本次回复中：先简短点评用户回答，然后给出本轮面试的总结和改进建议，结束面试。`
    : currentRound >= maxR - 2
      ? `\n（提示：当前第${currentRound + 1}轮，还剩${maxR - currentRound - 1}轮即结束。）`
      : "";

  if ((settings.mode ?? "project") === "quiz") {
    const difficultyLabel = { friendly: "简单", normal: "普通", strict: "困难" }[settings.pressure];
    const difficultyGuide = {
      friendly: "出基础概念题，侧重定义和直觉理解，允许口语化回答",
      normal: "出中等难度题，涉及原理推导和典型应用场景，要求条理清晰",
      strict: "出进阶/易混淆/有陷阱的题目，要求精确表述，会追问细节和边界情况",
    }[settings.pressure];
    return [
      `【系统指令】你是计算机保研面试的专业课考官，正在进行「${settings.quizSubject ?? "数据结构"}」快问快答。`,
      `难度：${difficultyLabel}（${difficultyGuide}）。`,
      "规则：",
      "1. 每次只出一道题，题目要具体明确，避免过于宽泛。",
      "2. 用户回答后：先给评分（x/10），再用1-2句话点评对错和不足，然后给出精炼的参考答案要点，最后自动出下一题。",
      '3. 如果用户说"下一题""换一题""不会""跳过"，直接出新题，不要重复上一题的答案。',
      "4. 题目来源于保研/考研面试高频考点，覆盖该科目核心章节，尽量不重复、不过于偏门。",
      "5. 回复格式示例：\n**评分：7/10**\n点评：基本正确，但遗漏了……\n参考答案：……\n\n---\n**下一题：**……",
      wrapUpInstruction,
    ].join("\n");
  }

  const langInstruction = settings.english
    ? "本场为英语面试，你必须全程用英文提问和点评。"
    : settings.englishIntro
      ? "开场要求候选人用英文做自我介绍（1-2分钟），之后切回中文追问。"
      : "本场为中文面试。";

  const pressureGuide = {
    friendly: "语气友善鼓励，先肯定亮点再温和指出不足，给候选人充分思考时间",
    normal: "语气专业中性，指出不足时直接但不苛刻，节奏适中",
    strict: "语气严肃，快速打断模糊回答，追问细节和矛盾之处，施加时间压力",
  }[settings.pressure];

  return [
    `【系统指令】你是计算机学院夏令营/保研复试面试官（教授身份）。`,
    `专业方向：${settings.direction}。压力风格：${pressureLabel(settings.pressure)}（${pressureGuide}）。`,
    `${langInstruction}`,
    `重点考察：${settings.focus}。计划追问 ${settings.maxRounds ?? 5} 轮左右。`,
    "面试策略：",
    "1. 围绕候选人回答深挖：技术选型理由、实验对比、失败经历、个人贡献占比。",
    "2. 每次回复包含：对上一个回答的简短点评（1-2句）+ 一个主要追问。不要一次抛出多个问题。",
    "3. 发现候选人回答模糊或有漏洞时，立即追问具体细节，不要轻易放过。",
    "4. 适时穿插基础知识提问（与项目相关的理论），测试候选人知识深度。",
    `5. 追问约 ${settings.maxRounds ?? 5} 轮后，给出本轮面试的简要总结和改进建议，然后询问是否继续。`,
    attachmentText,
    wrapUpInstruction,
  ].join("\n");
}

function fallbackInterviewReply(input: string, settings: InterviewSettings) {
  if ((settings.mode ?? "project") === "quiz") {
    return [
      "⚠️ 模型服务暂时不可用，已切换为本地兜底反馈。",
      "",
      `**评分：—/10**`,
      `你的回答提到了「${input.slice(0, 36)}」，但由于模型离线，无法给出准确评分。`,
      "",
      "**下一题（示例）：** 请解释什么是时间复杂度和空间复杂度，并举例说明二者的权衡。",
    ].join("\n");
  }

  const pressureTip =
    settings.pressure === "strict"
      ? "我会用比较高压的方式继续追问。"
      : settings.pressure === "friendly"
        ? "我会先引导你把答案说完整。"
        : "我会按标准复试节奏继续追问。";

  return [
    "⚠️ 模型服务暂时不可用，已切换为本地兜底面试反馈。",
    "",
    `**简短点评：** 你的回答提到了「${input.slice(0, 36)}」，但还没有说明具体贡献、技术取舍和量化结果。${pressureTip}`,
    "",
    "**追问：** 请具体说明你在项目中的个人贡献——你选择了什么技术方案、为什么选择它、最终效果如何、做过哪些对比实验？",
    "",
    "💡 **回答提示：** 按「任务背景 → 你的具体工作 → 方法选择理由 → 实验结果 → 反思改进」来组织回答。",
  ].join("\n");
}

export function InterviewApp() {
  const [activePage, setActivePage] = useState<PageKey>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [records, setRecords] = useState<InterviewRecord[]>([]);
  const [settings, setSettings] = useState<InterviewSettings>(defaultSettings);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canSend = useMemo(
    () => (input.trim().length > 0 || attachments.length > 0) && !isSending,
    [attachments.length, input, isSending],
  );

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("aiic-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      return;
    }

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("aiic-theme", theme);
  }, [theme]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("aiic-settings");
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<InterviewSettings>;
        setSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    window.localStorage.setItem("aiic-settings", JSON.stringify(settings));
    if (messages.length === 1 && messages[0].id === "welcome") {
      setMessages(getWelcomeMessages());
    }
  }, [settings]);

  function addFiles(fileList: FileList | File[]) {
    const nextFiles = Array.from(fileList)
      .slice(0, 5)
      .map((file) => ({
        id: createId(),
        name: file.name,
        type: file.type || "unknown",
        size: file.size,
      }));

    setAttachments((current) => [...current, ...nextFiles].slice(0, 8));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      addFiles(event.target.files);
      event.target.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
  }

  function saveRecord(nextMessages: ChatMessage[]) {
    const latestAssistant = [...nextMessages].reverse().find((message) => message.role === "assistant");
    const now = new Date();
    const ts = `${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const isQuiz = (settings.mode ?? "project") === "quiz";
    const modeLabel = isQuiz ? "专业课快问" : "保研面试";
    const levelLabel = isQuiz
      ? { friendly: "简单", normal: "普通", strict: "困难" }[settings.pressure]
      : pressureLabel(settings.pressure);
    const subjectLabel = isQuiz ? (settings.quizSubject ?? "数据结构") : settings.direction;
    const title = `${modeLabel}-${levelLabel}-${subjectLabel}-${ts}`;
    const record: InterviewRecord = {
      id: createId(),
      title,
      createdAt: now.toLocaleString("zh-CN", { hour12: false }),
      summary: latestAssistant?.content.slice(0, 90) || "等待面试官反馈",
      messages: nextMessages,
    };

    setRecords((current) => [record, ...current].slice(0, 10));
  }

  function getWelcomeMessages(): ChatMessage[] {
    if ((settings.mode ?? "project") === "quiz") {
      return [{
        id: "welcome",
        role: "assistant",
        content: `同学你好，现在进入「${settings.quizSubject ?? "数据结构"}」专业课快问快答环节。\n\n我会逐题提问高频面试题，你回答后我会给出点评和参考答案。\n\n准备好了吗？请回复"开始"，或直接说"下一题"。`,
      }];
    }
    const introRequest = settings.englishIntro
      ? "\n\n首先，请用 **英文** 做一段1-2分钟的自我介绍（包括你的学校、专业、研究方向和项目经历）。\n\n⚠️ 注意：本环节要求英文作答，如使用中文回答将酌情扣分。"
      : settings.english
        ? "\n\nTo begin, please give a **1-2 minute self-introduction** in English, covering your university, major, research interests, and project experience."
        : "\n\n首先，请做一段简短的自我介绍（包括你的学校、专业、研究方向和主要项目经历）。";
    return [{
      id: "welcome",
      role: "assistant",
      content:
        `同学你好，我是本次保研模拟面试的面试官。\n\n请先在左侧「面试官属性」中设置专业方向和压力程度，然后：\n- **粘贴**你的项目经历或简历片段\n- 或**上传**你的简历/项目文档${introRequest}`,
    }];
  }

  function startNewInterview() {
    setMessages(getWelcomeMessages());
    setAttachments([]);
    setInput("");
    setError("");
    setReport(null);
    setActivePage("training");
  }

  const userMessageCount = useMemo(
    () => messages.filter((m) => m.role === "user").length,
    [messages],
  );

  async function generateReport() {
    if (isGeneratingReport || userMessageCount < 2) return;
    setIsGeneratingReport(true);
    setError("");

    const isQuiz = (settings.mode ?? "project") === "quiz";
    const dims = isQuiz
      ? "知识准确性、知识覆盖面、表述清晰度、反应速度、举一反三"
      : "项目表达、专业基础、逻辑清晰度、英语表达、应变能力";
    const dimExample = isQuiz
      ? '{"name":"知识准确性","score":8,"comment":"..."},{"name":"知识覆盖面","score":6,"comment":"..."},{"name":"表述清晰度","score":7,"comment":"..."},{"name":"反应速度","score":6,"comment":"..."},{"name":"举一反三","score":7,"comment":"..."}'
      : '{"name":"项目表达","score":8,"comment":"..."},{"name":"专业基础","score":6,"comment":"..."},{"name":"逻辑清晰度","score":7,"comment":"..."},{"name":"英语表达","score":6,"comment":"..."},{"name":"应变能力","score":7,"comment":"..."}';
    const reportPrompt = `请根据以下对话，对候选人进行评估。以纯JSON格式回复（不要markdown代码块），结构如下：
{"dimensions":[${dimExample}],"overall":"总体评价（2-3句话）...","suggestion":"具体可执行的改进建议（3-5条）..."}
评估维度：${dims}。每项1-10分，comment要具体引用对话中的表现。请严格按此JSON格式输出。`;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: reportPrompt },
            ...messages.map(({ role, content }) => ({ role, content })),
            { role: "user", content: "请根据以上对话生成评分报告。" },
          ],
        }),
      });
      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || !data.reply) throw new Error(data.error || "生成报告失败");

      const jsonStr = data.reply.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(jsonStr) as InterviewReport;
      if (!parsed.dimensions || !Array.isArray(parsed.dimensions)) throw new Error("报告格式异常");
      setReport(parsed);
    } catch (err) {
      setError(err instanceof Error ? `报告生成失败：${err.message}` : "报告生成失败");
    } finally {
      setIsGeneratingReport(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;

    const nextText = input.trim() || "请根据我上传的材料开始一轮保研模拟面试。";
    const attachmentPrompt = attachments.length
      ? `\n\n附件清单：${attachments.map((file) => `${file.name}（${formatBytes(file.size)}）`).join("；")}`
      : "";
    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: nextText,
      attachments,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setAttachments([]);
    setError("");
    setIsSending(true);

    let withReply: ChatMessage[];

    const maxRetries = 2;
    const retryDelay = 3000;
    let lastError: unknown = null;
    let success = false;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        setError(`模型请求失败，${retryDelay / 1000}s 后重试（${attempt}/${maxRetries}）…`);
        await new Promise((r) => setTimeout(r, retryDelay));
        setError("");
      }
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              { role: "user", content: buildContext(settings, attachments, nextMessages.filter(m => m.role === "user").length) },
              ...nextMessages.map(({ role, content }) => ({
                role,
                content: role === "user" ? `${content}${attachmentPrompt}` : content,
              })),
            ],
          }),
        });
        const data = (await response.json()) as { reply?: string; error?: string };
        if (!response.ok || !data.reply) throw new Error(data.error || "模型暂时没有返回内容。");

        withReply = [
          ...nextMessages,
          { id: createId(), role: "assistant" as const, content: data.reply },
        ];
        success = true;
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!success) {
      const fallbackReply = fallbackInterviewReply(nextText, settings);
      withReply = [
        ...nextMessages,
        { id: createId(), role: "assistant" as const, content: fallbackReply },
      ];
      setError(
        lastError instanceof Error
          ? `模型接口异常（已重试${maxRetries}次），已使用本地兜底回复：${lastError.message}`
          : "模型接口异常，已使用本地兜底回复。",
      );
    }

    setMessages(withReply!);
    saveRecord(withReply!);
    setIsSending(false);
    requestAnimationFrame(() => inputRef.current?.focus());

    const newUserCount = withReply!.filter((m) => m.role === "user").length;
    if (newUserCount >= (settings.maxRounds ?? 5)) {
      setTimeout(() => generateReport(), 500);
    }
  }

  return (
    <div className={`app-layout theme-${theme} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <button
            className="icon-button"
            type="button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={sidebarCollapsed ? "展开信息栏" : "收起信息栏"}
            title={sidebarCollapsed ? "展开信息栏" : "收起信息栏"}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
          <img className="brand-mark" src="/icon.png" alt="产品图标" />
        </div>

        <nav className="sidebar-nav" aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`nav-item ${activePage === item.key ? "active" : ""}`}
                key={item.key}
                type="button"
                onClick={() => setActivePage(item.key)}
                title={item.label}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          className="theme-toggle"
          type="button"
          onClick={() => setTheme((value) => (value === "light" ? "dark" : "light"))}
          aria-label={theme === "light" ? "切换到深色模式" : "切换到浅色模式"}
          title={theme === "light" ? "切换到深色模式" : "切换到浅色模式"}
        >
          <span className="half-moon-icon" aria-hidden="true" />
          <span>{theme === "light" ? "浅色模式" : "深色模式"}</span>
        </button>
      </aside>

      <main className="main-panel">
        {activePage === "home" && <HomeView onStart={() => setActivePage("training")} />}
        {activePage === "training" && (
          <TrainingView
            attachments={attachments}
            canSend={canSend}
            error={error}
            fileInputRef={fileInputRef}
            input={input}
            inputRef={inputRef}
            isDragging={isDragging}
            isGeneratingReport={isGeneratingReport}
            isSending={isSending}
            messages={messages}
            onDrop={handleDrop}
            onFileChange={handleFileChange}
            onGenerateReport={generateReport}
            onInputChange={setInput}
            onNewInterview={startNewInterview}
            onRemoveAttachment={(id) => setAttachments((current) => current.filter((file) => file.id !== id))}
            onSubmit={handleSubmit}
            onToggleDrag={setIsDragging}
            report={report}
            userMessageCount={userMessageCount}
          />
        )}
        {activePage === "settings" && <SettingsView settings={settings} onChange={setSettings} />}
        {activePage === "records" && (
          <RecordsView
            records={records}
            onLoad={(record) => {
              setMessages(record.messages);
              setActivePage("training");
            }}
            onNew={startNewInterview}
          />
        )}
      </main>
    </div>
  );
}

function HomeView({ onStart }: { onStart: () => void }) {
  return (
    <section className="home-view">
      <div className="hero-background-slot" aria-hidden="true" />
      <div className="hero-center">
        <p className="eyebrow">Accelerate, Accurate, Accompany</p>
        <h1>3As 智能面试官</h1>
        <p>专为计算机专业保研学生打造的模拟面试训练平台。</p>
        <button className="primary-action" type="button" onClick={onStart}>
          立即开始
          <ChevronRight size={18} />
        </button>
        <div className="feature-cards">
          <div className="feature-card">
            <Settings2 size={24} />
            <strong>可调面试官</strong>
            <span>自定义压力程度、专业方向和考察重点，模拟不同风格面试官</span>
          </div>
          <div className="feature-card">
            <MessageSquareText size={24} />
            <strong>AI 追问反馈</strong>
            <span>连续深入追问项目细节，给出针对性点评和改进建议</span>
          </div>
          <div className="feature-card">
            <BookOpen size={24} />
            <strong>专业课快问</strong>
            <span>数据结构、ML、线代等高频考点逐题训练</span>
          </div>
          <div className="feature-card">
            <ClipboardCheck size={24} />
            <strong>评分报告</strong>
            <span>面试结束后自动生成五维评分与改进建议</span>
          </div>
        </div>
      </div>
    </section>
  );
}

type TrainingViewProps = {
  attachments: Attachment[];
  canSend: boolean;
  error: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  input: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  isDragging: boolean;
  isGeneratingReport: boolean;
  isSending: boolean;
  messages: ChatMessage[];
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onGenerateReport: () => void;
  onInputChange: (value: string) => void;
  onNewInterview: () => void;
  onRemoveAttachment: (id: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleDrag: (value: boolean) => void;
  report: InterviewReport | null;
  userMessageCount: number;
};

function TrainingView(props: TrainingViewProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [props.messages, props.isSending]);

  return (
    <section
      className={`training-view ${props.isDragging ? "dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        props.onToggleDrag(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) props.onToggleDrag(false);
      }}
      onDrop={props.onDrop}
    >
      <header className="section-header">
        <div>
          <p className="eyebrow">Interview Training</p>
          <h2>面试训练</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="ghost-action" type="button" onClick={props.onNewInterview}>
            新建面试
          </button>
          <button className="ghost-action" type="button" onClick={() => props.fileInputRef.current?.click()}>
            <Upload size={17} />
            上传材料
          </button>
          {props.userMessageCount >= 2 && (
            <button
              className="ghost-action report-btn"
              type="button"
              onClick={props.onGenerateReport}
              disabled={props.isGeneratingReport}
            >
              {props.isGeneratingReport ? <Loader2 size={17} className="spin" /> : <ClipboardCheck size={17} />}
              {props.isGeneratingReport ? "生成中..." : "生成报告"}
            </button>
          )}
        </div>
      </header>

      <div className="chat-shell">
        <div className="message-list" aria-live="polite">
          {props.messages.map((message) => {
            const isUser = message.role === "user";
            const Icon = isUser ? User : Bot;
            return (
              <article className={`message-row ${isUser ? "from-user" : "from-assistant"}`} key={message.id}>
                <div className="avatar" aria-hidden="true">
                  <Icon size={18} />
                </div>
                <div className={`message-bubble ${isUser ? '' : 'markdown-body'}`}>
                  {isUser ? <p>{message.content}</p> : <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>}
                  {message.attachments?.length ? (
                    <div className="attachment-row">
                      {message.attachments.map((file) => (
                        <span className="file-chip" key={file.id}>
                          {file.type.startsWith("image") ? <ImageIcon size={14} /> : <FileText size={14} />}
                          {file.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}

          {props.isSending ? (
            <article className="message-row from-assistant">
              <div className="avatar" aria-hidden="true">
                <Bot size={18} />
              </div>
              <div className="message-bubble pending">
                <Loader2 size={16} className="spin" aria-hidden="true" />
                <span>面试官正在追问...</span>
              </div>
            </article>
          ) : null}
          {props.report && <ReportCard report={props.report} />}
          <div ref={bottomRef} />
        </div>

        {props.isDragging ? (
          <div className="drop-overlay">
            <Upload size={30} />
            <span>松开以上传图片或文档</span>
          </div>
        ) : null}

        {props.error ? <p className="error-text">{props.error}</p> : null}

        <form className="composer" onSubmit={props.onSubmit}>
          <input
            ref={props.fileInputRef}
            type="file"
            hidden
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.md"
            onChange={props.onFileChange}
          />
          {props.attachments.length ? (
            <div className="pending-files">
              {props.attachments.map((file) => (
                <span className="file-chip" key={file.id}>
                  {file.type.startsWith("image") ? <ImageIcon size={14} /> : <FileText size={14} />}
                  {file.name}
                  <button type="button" onClick={() => props.onRemoveAttachment(file.id)} title="移除">
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <div className="composer-row">
            <button
              className="attach-button"
              type="button"
              onClick={() => props.fileInputRef.current?.click()}
              aria-label="选择附件"
              title="选择附件"
            >
              <Paperclip size={19} />
            </button>
            <textarea
              ref={props.inputRef}
              value={props.input}
              onChange={(event) => {
                props.onInputChange(event.target.value);
                event.target.style.height = 'auto';
                event.target.style.height = `${Math.min(event.target.scrollHeight, 150)}px`;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="请输入回答，按Enter发送"
              rows={1}
            />
            <button className="send-button" type="submit" disabled={!props.canSend} aria-label="发送消息" title="发送消息">
              {props.isSending ? <Loader2 size={19} className="spin" /> : <Send size={19} />}
            </button>
          </div>
        </form>
      </div>

    </section>
  );
}

function RadarChart({ dimensions }: { dimensions: ReportDimension[] }) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const maxScore = 10;
  const levels = [2, 4, 6, 8, 10];
  const radius = 100;
  const angleStep = (2 * Math.PI) / dimensions.length;
  const startAngle = -Math.PI / 2;

  function polarToXY(angle: number, r: number) {
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  function polygonPoints(values: number[]) {
    return values
      .map((v, i) => {
        const a = startAngle + i * angleStep;
        const p = polarToXY(a, (v / maxScore) * radius);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  }

  return (
    <div className="radar-chart-wrapper">
      <svg viewBox={`0 0 ${size} ${size}`} className="radar-chart">
        {levels.map((l) => (
          <polygon
            key={l}
            points={dimensions
              .map((_, i) => {
                const a = startAngle + i * angleStep;
                const p = polarToXY(a, (l / maxScore) * radius);
                return `${p.x},${p.y}`;
              })
              .join(" ")}
            className="radar-grid"
          />
        ))}
        {dimensions.map((_, i) => {
          const a = startAngle + i * angleStep;
          const p = polarToXY(a, radius);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} className="radar-axis" />;
        })}
        <polygon
          points={polygonPoints(dimensions.map((d) => d.score))}
          className="radar-area"
        />
        <polygon
          points={polygonPoints(dimensions.map((d) => d.score))}
          className="radar-area-stroke"
        />
        {dimensions.map((dim, i) => {
          const a = startAngle + i * angleStep;
          const labelR = radius + 30;
          const p = polarToXY(a, labelR);
          return (
            <text
              key={dim.name}
              x={p.x}
              y={p.y}
              className="radar-label"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {dim.name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function ReportCard({ report }: { report: InterviewReport }) {
  return (
    <div className="report-card">
      <h3 className="report-title">
        <ClipboardCheck size={20} />
        面试评估报告
      </h3>
      <RadarChart dimensions={report.dimensions} />
      <div className="report-dimensions">
        {report.dimensions.map((dim) => (
          <div className="report-dim" key={dim.name}>
            <div className="report-dim-header">
              <span className="report-dim-name">{dim.name}</span>
              <span className="report-dim-score">{dim.score}/10</span>
            </div>
            <div className="score-bar">
              <div className="score-bar-fill" style={{ width: `${(dim.score / 10) * 100}%` }} />
            </div>
            <p className="report-dim-comment">{dim.comment}</p>
          </div>
        ))}
      </div>
      <div className="report-overall">
        <strong>总体评价</strong>
        <p>{report.overall}</p>
      </div>
      <div className="report-suggestion">
        <strong>改进建议</strong>
        <p>{report.suggestion}</p>
      </div>
    </div>
  );
}

function SettingsView({
  settings,
  onChange,
}: {
  settings: InterviewSettings;
  onChange: (settings: InterviewSettings) => void;
}) {
  return (
    <section className="settings-view">
      <header className="section-header">
        <div>
          <p className="eyebrow">Interviewer Profile</p>
          <h2>面试官属性</h2>
        </div>
      </header>

      <div className="settings-grid">
        <div className="setting-block">
          <div className="setting-title">
            <BookOpen size={18} />
            <span>训练模式</span>
          </div>
          <div className="segmented-control">
            {([["project", "保研面试"], ["quiz", "专业课快问"]] as [TrainingMode, string][]).map(([mode, label]) => (
              <button
                className={(settings.mode ?? "project") === mode ? "selected" : ""}
                key={mode}
                type="button"
                onClick={() => onChange({ ...settings, mode })}
              >
                {label}
              </button>
            ))}
          </div>
          {(settings.mode ?? "project") === "quiz" && (
            <div className="quiz-subject-grid">
              {quizSubjects.map((subject) => (
                <button
                  className={`quiz-subject-btn ${(settings.quizSubject ?? "数据结构") === subject ? "selected" : ""}`}
                  key={subject}
                  type="button"
                  onClick={() => onChange({ ...settings, quizSubject: subject })}
                >
                  {subject}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="setting-block">
          <div className="setting-title">
            <Gauge size={18} />
            <span>{(settings.mode ?? "project") === "quiz" ? "难度" : "压力程度"}</span>
          </div>
          <div className="segmented-control">
            {(["friendly", "normal", "strict"] as PressureLevel[]).map((level) => {
              const label = (settings.mode ?? "project") === "quiz"
                ? { friendly: "简单", normal: "普通", strict: "困难" }[level]
                : pressureLabel(level);
              return (
                <button
                  className={settings.pressure === level ? "selected" : ""}
                  key={level}
                  type="button"
                  onClick={() => onChange({ ...settings, pressure: level })}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="setting-block">
          <span className="setting-title">专业方向</span>
          <input
            value={settings.direction}
            onChange={(event) => onChange({ ...settings, direction: event.target.value })}
            placeholder="例如：计算机视觉 / 系统 / NLP / 软件工程"
          />
        </label>

        <label className="setting-block">
          <span className="setting-title">重点考察</span>
          <textarea
            value={settings.focus}
            onChange={(event) => onChange({ ...settings, focus: event.target.value })}
            rows={5}
            placeholder="例如：项目贡献、算法基础、科研潜力、英文表达"
          />
        </label>

        <div className="setting-block compact">
          <span className="setting-title">英语面试</span>
          <label className="toggle-line">
            <input
              type="checkbox"
              checked={settings.english}
              onChange={(event) => onChange({ ...settings, english: event.target.checked })}
            />
            <span>开启英文追问和英文表达反馈</span>
          </label>
          <label className="toggle-line">
            <input
              type="checkbox"
              checked={settings.englishIntro ?? false}
              onChange={(event) => onChange({ ...settings, englishIntro: event.target.checked })}
            />
            <span>要求英语自我介绍</span>
          </label>
        </div>

        <div className="setting-block compact">
          <span className="setting-title">追问轮数：{settings.maxRounds ?? 5} 轮</span>
          <input
            className="rounds-slider"
            type="range"
            min={2}
            max={10}
            step={1}
            value={settings.maxRounds ?? 5}
            onChange={(e) => onChange({ ...settings, maxRounds: Number(e.target.value) })}
          />
          <div className="slider-labels">
            <span>2</span>
            <span>10</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function RecordsView({
  records,
  onLoad,
  onNew,
}: {
  records: InterviewRecord[];
  onLoad: (record: InterviewRecord) => void;
  onNew: () => void;
}) {
  return (
    <section className="records-view">
      <header className="section-header">
        <div>
          <p className="eyebrow">Interview History</p>
          <h2>面试记录</h2>
        </div>
        <button className="ghost-action" type="button" onClick={onNew}>
          新建面试
        </button>
      </header>

      <div className="record-list">
        {records.length ? (
          records.map((record, index) => (
            <button className="record-item" key={record.id} type="button" onClick={() => onLoad(record)}>
              <span className="record-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="record-main">
                <strong>{record.title}</strong>
                <small>{record.createdAt}</small>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          ))
        ) : (
          <div className="empty-state">
            <History size={32} />
            <p>暂无面试记录。完成一次训练后，这里会保存最近 10 条对话。</p>
          </div>
        )}
      </div>
    </section>
  );
}
