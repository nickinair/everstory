// AI Service with backend proxy to secure API keys
const API_BASE_URL = ''; // Relative to the host

async function callAIProxy(action: string, payload: any) {
  const response = await fetch(`${API_BASE_URL}/api/ai/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, payload }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'AI request failed');
  }

  const data = await response.json();
  return data.result;
}

export async function generateStoryFromMedia(base64Data: string, mimeType: string) {
  const prompt = `请根据上传的媒体内容（图片或视频），提取其中的关键内容，并生成：
1. 一个简洁、吸引人的故事标题。
2. 一段生动、感人的故事内容（以第一人称叙述）。

在生成内容时，请注意：
- 自动过滤掉语音中的语气词（如“呃”、“那个”、“然后”、“就是”等）。
- 根据语义逻辑进行智能分段，并添加合适的标点符号，使阅读体验更流畅。

请直接返回 JSON 格式的数据，样例如下：
{
  "title": "故事的标题",
  "content": "故事的具体内容..."
}
不要包含任何其他文字、Markdown 格式标记或解释。`;

  try {
    const resultText = await callAIProxy('generateStory', {
      base64Data,
      mimeType,
      prompt
    });

    const cleanText = resultText.trim();

    // Extract JSON if wrapped in markdown code blocks
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { title: "", content: cleanText };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return { title: "", content: "" };
  }
}

export async function transcribeMedia(base64Data: string, mimeType: string) {
  console.log(`Transcribing media of type: ${mimeType}`);
  const prompt = `你是一位专业的速记员和编辑。请将这段媒体内容中的语音准确地转化为文字。
在转写过程中，请遵循以下规则：
1. **口语过滤**：自动去除“呃”、“那个”、“然后”、“就是”、“这个”等无意义的语气词。
2. **智能分段**：根据说话者的停顿长短和语义逻辑，自动进行合理的段落划分。
3. **标点优化**：在合适的位置增加标点符号（逗号、句号、感叹号等），确保逻辑清晰。
4. **保持原意**：在修整口语的同时，务必保留说话者的语气和核心表达，不要过度润色成书面语。

仅返回转化后的文字内容，不要包含任何其他文字或解释。请尽力识别，即使声音微弱或有底噪也要尝试提取关键信息。如果媒体中确实没有任何说话声音，请直接返回"（未检测到语音）"。`;

  try {
    const resultText = await callAIProxy('transcribe', {
      base64Data,
      mimeType,
      prompt
    });

    console.log("Raw transcription output:", resultText);
    return resultText.trim();
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
}

export async function optimizeStoryContent(content: string, mode: 'first' | 'third' | 'cleaned') {
  let modeDesc = '';
  if (mode === 'first') {
    modeDesc = '以【第一人称自述】的故事手法改写。要求：1. 将碎片化的口语转化为流畅、动人的书面语言。2. 保持真实感和共鸣力。';
  } else if (mode === 'third') {
    modeDesc = '以【第三人称传记】的手法改写。要求：1. 语言客观、优美、富有文学色彩。2. 逻辑严密，叙述连贯。';
  } else {
    modeDesc = '进行【文字精简整理】。规则：1. 【禁止改写】或替换任何原词，禁止改变表达习惯。2. 【仅允许】剔除语气词（额、那个、然后、就是）和明显的口误。3. 修正标点并分段。4. 篇幅必须与原文高度一致。';
  }

  const prompt = `你是一位专业的故事编辑。请针对以下【语音转录内容】，按照【${modeDesc}】的要求进行优化。
  
【核心准则】：
1. 录音中的【语音转录文本】是创作的唯一合法来源。
2. 【禁止】根据想象添加视频画面中的视觉细节（如环境描写、动作捕捉等），除非文本中有明确提及。
3. 工作的核心是：【视角转换】（人称） + 【口语转书面】（去口语化）。
4. 如果是“第一人称”或“第三人称”模式，篇幅应在原文基础上增加 100-150%。这种扩展应基于原文已有的细节进行深度挖掘，而非编造。
5. 提取一个新的、更贴切的【故事标题】。
6. 严格按照 JSON 格式返回，样例如下：
{
  "title": "...",
  "content": "..."
}
不要包含任何多余文字。

待优化内容：
${content}`;

  try {
    const resultText = await callAIProxy('optimize', {
      prompt
    });
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { title: "", content: resultText.trim() || content };
  } catch (error) {
    console.error("Optimize story error:", error);
    return { title: "", content: content };
  }
}

export async function generateGuidedPrompts(role: string, profession: string, keywords: string[], tone: string) {
  const prompt = `你是一位资深的口述历史专家。请根据以下背景信息：
讲述人角色：${role}
讲述人职业：${profession}
核心关键词：${keywords.join("、")}
情绪基调：${tone}

生成 5 条能引起情感共鸣、细节导向的访谈题目。题目要具体，避免空洞。
请直接返回这 5 条题目，每行一条，不要包含数字序号或其他文字。`;

  try {
    const resultText = await callAIProxy('generatePrompts', {
      prompt
    });

    // Split by newline and filter out empty lines
    return (resultText || "").split("\n").map((s: string) => s.trim().replace(/^\d+\.\s*/, "")).filter((s: string) => s.length > 0).slice(0, 5);
  } catch (error) {
    console.error("Generate prompts error:", error);
    throw error;
  }
}

