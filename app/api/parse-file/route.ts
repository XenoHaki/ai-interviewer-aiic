import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "未收到文件" }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv")) {
      text = buffer.toString("utf-8");
    } else if (name.endsWith(".pdf")) {
      const { PDFParse } = await import("pdf-parse");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parser = new PDFParse({ data: new Uint8Array(buffer) }) as any;
      await parser.load();
      const result = await parser.getText();
      text = typeof result === "string" ? result : result?.text ?? "";
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".doc")) {
      text = "[.doc 格式暂不支持解析，请转换为 .docx 或 .pdf 后重新上传]";
    } else {
      text = `[不支持解析的文件格式: ${name}]`;
    }

    // Truncate to avoid exceeding token limits
    const maxChars = 12000;
    const truncated = text.length > maxChars;
    text = text.slice(0, maxChars).trim();

    return NextResponse.json({ text, truncated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "文件解析失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
