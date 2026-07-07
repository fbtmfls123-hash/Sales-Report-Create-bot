import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to get GoogleGenAI client based on request header or system environment
const getAiClient = (req: express.Request) => {
  const customKey = req.headers["x-gemini-api-key"] as string;
  if (!customKey) return null; // Strictly custom personal API Key required
  return new GoogleGenAI({
    apiKey: customKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// API endpoint to verify a Gemini API Key (strictly custom personal API key)
app.post("/api/gemini/verify", async (req, res) => {
  try {
    const customKey = req.headers["x-gemini-api-key"] as string || req.body.apiKey;

    if (!customKey) {
      return res.status(400).json({ valid: false, error: "개인 API Key가 전송되지 않았습니다." });
    }

    const testAi = new GoogleGenAI({
      apiKey: customKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Run a small check to verify
    const response = await testAi.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Hello. Return only 'OK'",
      config: {
        maxOutputTokens: 5
      }
    });

    if (response && response.text) {
      return res.json({ valid: true, source: "custom" });
    } else {
      return res.status(400).json({ valid: false, error: "Gemini 응답이 비어있습니다. 개인 API Key를 다시 한 번 확인해 주세요." });
    }
  } catch (error: any) {
    console.error("Gemini Key verification failed:", error);
    return res.status(400).json({ 
      valid: false, 
      error: error.message || "유효하지 않은 API Key이거나 네트워크 오류가 발생했습니다. 올바른 키 값인지 확인해 주세요." 
    });
  }
});

// API endpoint to parse multiple clients from free-text
app.post("/api/gemini/parse-clients", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const reqAi = getAiClient(req);

    if (!reqAi) {
      console.warn("Gemini API Client is not available. Falling back to local simple parser.");
      // Simple local parsing if key is missing (for local testing without keys)
      const parts = text.split(/[,;\n]/).map((p: string) => p.trim()).filter(Boolean);
      const mockClients = parts.map((part: string) => {
        const subParts = part.split(/\s+/);
        return {
          name: subParts[0] || "미정 고객사",
          person: subParts.slice(1).join(" ") || "담당자 미정"
        };
      });
      return res.json({ clients: mockClients });
    }

    const prompt = `Analyze the following sales report/memo from a B2B sales rep. Extract all distinct client companies and their corresponding contact persons/representatives mentioned.
Input text: "${text}"

Provide the output in JSON format matching the schema exactly.
If a contact person is not mentioned, use "미확인" or an empty string. Extract ONLY companies and contact persons. Do not invent details. Keep names short and professional (e.g. "A사", "김부장").`;

    const response = await reqAi.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Company/Client name" },
                  person: { type: Type.STRING, description: "Contact person / position if mentioned, or empty/미확인" }
                },
                required: ["name"]
              }
            }
          },
          required: ["clients"]
        }
      }
    });

    const parsedData = JSON.parse(response.text?.trim() || "{\"clients\":[]}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error parsing clients via Gemini:", error);
    res.status(500).json({ error: error.message || "Failed to parse clients" });
  }
});

// API endpoint to refine raw report data into professional B2B corporate jargon
app.post("/api/gemini/refine-report", async (req, res) => {
  try {
    const { reportType, clientName, clientPerson, purpose, result, dealAmount, dealProbability, outlier } = req.body;

    const reqAi = getAiClient(req);

    if (!reqAi) {
      console.warn("Gemini API Client is not available. Falling back to simple uppercase/static refiner.");
      // Simple fallback
      return res.json({
        purpose: purpose || "영업 활동 수행",
        result: result || "상담 완료",
        pipeline: `금액: ${dealAmount || "미확인"} / 확률: ${dealProbability || "미확인"}`,
        outlier: outlier || "특이사항 없음",
        action: "차주 중 후속 대면 미팅 및 추가 조율 예정"
      });
    }

    const prompt = `You are an expert B2B Sales Consultant & CRM Data Quality Specialist. 
Your task is to transform raw, casual, or conversational notes from a sales representative into highly polished, professional corporate jargon ("비즈니스 실무 워딩", Corporate Jargon).

Strict Guidelines:
1. Translate casual language (e.g., "사과하러 감", "진정시켰음", "소문", "분위기 좋았음") into crisp corporate phrasing (e.g., "CS 이슈 대응", "1차 리스크 방어", "경쟁사 도입 검토 정황 포착", "제안 조건 긍정적 검토").
2. Write in formal, compact, non-emotional noun-terminated clauses (개조식·명사형 종결: "~수행", "~완료", "~진행", "~예정", "~대응", "~조율").
3. Completely exclude all emotions, exclamation marks, or descriptive adjectives that are unprofessional.
4. Format Pipeline figures clearly. Standardize dealAmount (use Korean currency formatting, e.g., "1억 원" or "10,000,000원") and dealProbability (must be % or % range).
5. Extract or propose a clear, action-oriented next step (Action Plan) with a standard date format or placeholder if none was specified (e.g., "금주 내", "차주 중").

Raw Input Data:
- Report Type: ${reportType}
- Client: ${clientName} (${clientPerson || "담당자 미확인"})
- Sales Purpose: ${purpose}
- Result: ${result}
- Deal Value: ${dealAmount || "미확인"}
- Probability: ${dealProbability || "미확인"}
- Outliers / Competitors: ${outlier}

Provide the refined fields in the requested JSON structure. Keep explanations concise, professional, and dense with corporate vocabulary.`;

    const response = await reqAi.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            purpose: { type: Type.STRING, description: "Refined sales purpose in corporate jargon (개조식 명사형)" },
            result: { type: Type.STRING, description: "Refined sales result/outcome in corporate jargon (개조식 명사형)" },
            pipeline: { type: Type.STRING, description: "Standardized pipeline description (e.g. '금액: 50,000,000원 / 확률: 70%')" },
            outlier: { type: Type.STRING, description: "Refined competitor activity or risk details (개조식 명사형)" },
            action: { type: Type.STRING, description: "Refined next action plan with timeframes (e.g. '차주 중 추가 제안서 전달 및 기술 사양 조율')" }
          },
          required: ["purpose", "result", "pipeline", "outlier", "action"]
        }
      }
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error refining report via Gemini:", error);
    res.status(500).json({ error: error.message || "Failed to refine report" });
  }
});

// Serve API routes first
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Vite middleware for development, static assets for production
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
