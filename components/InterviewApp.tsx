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
      "同学你好，我是本次夏令营的面试官。请选择训练目标，粘贴你的项目/简历片段，或上传材料后开始模拟面试。我会连续追问并给出反馈。",
  },
];

const quizSubjects = ["数据结构", "机器学习", "操作系统", "计算机网络", "线性代数", "概率论", "高等数学", "计算机系统导论", "算法设计与分析"];

const defaultSettings: InterviewSettings = {
  pressure: "normal",
  direction: "多模态NLP",
  english: false,
  englishIntro: false,
  focus: "项目深挖、专业基础、科研潜力",
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

function buildContext(settings: InterviewSettings, attachments: Attachment[]) {
  const attachmentText = attachments.length
    ? `本轮用户上传了材料：${attachments.map((file) => file.name).join("、")}。如果无法直接读取文件内容，请提醒用户粘贴关键片段。`
    : "本轮用户未上传附件。";

  if ((settings.mode ?? "project") === "quiz") {
    const difficultyLabel = { friendly: "简单", normal: "普通", strict: "困难" }[settings.pressure];
    return [
      `你是计算机保研面试考官，当前进行专业课快问快答环节。科目：${settings.quizSubject ?? "数据结构"}。难度=${difficultyLabel}。`,
      "请随机挑选一道该科目的高频保研面试题提问。",
      "用户回答后给出简短点评（10分制分数，形如x/10）+ 参考答案要点 + 下一题。",
      "保持节奏紧凑，每次只问一题。如果用户说'下一题'或'换一题'，直接出新题。",
    ].join("\n");
  }

  return [
    `面试官设置：压力程度=${pressureLabel(settings.pressure)}；专业方向=${settings.direction}；是否英语面试=${settings.english ? "是" : "否"}；要求英语自我介绍=${settings.englishIntro ? "是" : "否"}；追问轮数=${settings.maxRounds ?? 5}；重点考察=${settings.focus}。`,
    "你是一名计算机学院夏令营保研复试的面试老师。优先连续追问项目细节、专业基础、科研潜力和表达漏洞。",
    "每次回复尽量包含：一个主要追问、简短点评、下一步回答提示。不要一次抛出太多问题。",
    attachmentText,
  ].join("\n");
}

function fallbackInterviewReply(input: string, settings: InterviewSettings) {
  const pressureTip =
    settings.pressure === "strict"
      ? "我会用比较高压的方式继续追问。"
      : settings.pressure === "friendly"
        ? "我会先引导你把答案说完整。"
        : "我会按标准复试节奏继续追问。";

  return [
    "当前模型服务暂时不可用，已切换为本地兜底面试反馈。",
    "",
    `简短点评：你的回答提到了「${input.slice(0, 36)}」，但还没有说明具体贡献、技术取舍和量化结果。${pressureTip}`,
    "",
    "追问：你说自己负责模型训练，请具体说明你选择了什么模型结构、为什么选择它、最终指标是多少，以及你做过哪些失败实验或对比实验？",
    "",
    "回答提示：按「任务背景 -> 你的具体工作 -> 方法选择理由 -> 实验结果 -> 反思改进」来回答。",
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
    return initialMessages;
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

    const reportPrompt = `请根据以下面试对话，对候选人进行评估。以纯JSON格式回复（不要markdown代码块），结构如下：
{"dimensions":[{"name":"项目表达","score":4,"comment":"..."},{"name":"专业基础","score":3,"comment":"..."},{"name":"逻辑清晰度","score":4,"comment":"..."},{"name":"英语表达","score":3,"comment":"..."},{"name":"应变能力","score":4,"comment":"..."}],"overall":"总体评价...","suggestion":"改进建议..."}
维度：项目表达、专业基础、逻辑清晰度、英语表达、应变能力。每项1-5分。请严格按此JSON格式输出。`;

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

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: buildContext(settings, attachments) },
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
    } catch (requestError) {
      const fallbackReply = fallbackInterviewReply(nextText, settings);
      withReply = [
        ...nextMessages,
        { id: createId(), role: "assistant" as const, content: fallbackReply },
      ];
      setError(
        requestError instanceof Error
          ? `模型接口异常，已使用本地兜底回复：${requestError.message}`
          : "模型接口异常，已使用本地兜底回复。",
      );
    } finally {
      if (withReply!) {
        setMessages(withReply);
        saveRecord(withReply);
      }
      setIsSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
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
          <div className="brand-mark">AI</div>
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
        <p className="eyebrow">Computer Science Recommendation Interview</p>
        <h1>AI面试官</h1>
        <p>面向计算机专业保研学生的模拟面试训练工具。</p>
        <button className="primary-action" type="button" onClick={onStart}>
          开始训练
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

      {props.report && <ReportCard report={props.report} />}
    </section>
  );
}

function ReportCard({ report }: { report: InterviewReport }) {
  return (
    <div className="report-card">
      <h3 className="report-title">
        <ClipboardCheck size={20} />
        面试评估报告
      </h3>
      <div className="report-dimensions">
        {report.dimensions.map((dim) => (
          <div className="report-dim" key={dim.name}>
            <div className="report-dim-header">
              <span className="report-dim-name">{dim.name}</span>
              <span className="report-dim-score">{dim.score}/5</span>
            </div>
            <div className="score-bar">
              <div className="score-bar-fill" style={{ width: `${(dim.score / 5) * 100}%` }} />
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
          <span className="setting-title">追问轮数</span>
          <div className="segmented-control">
            {[3, 5, 8].map((n) => (
              <button
                className={(settings.maxRounds ?? 5) === n ? "selected" : ""}
                key={n}
                type="button"
                onClick={() => onChange({ ...settings, maxRounds: n })}
              >
                {n} 轮
              </button>
            ))}
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
