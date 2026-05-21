import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables
dotenv.config();

const PORT = 3000;

// Lazy initialize GoogleGenAI to prevent crashing on boot if key is missing
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("مفتاح واجهة برمجة التطبيقات GEMINI_API_KEY أو VITE_GEMINI_API_KEY غير متوفر. يرجى تهيئته عبر إعدادات المنصة.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Route: Generate AI Question
  app.post("/api/generate-question", async (req, res) => {
    try {
      const { level, component, lessonName } = req.body;

      if (!level || !component || !lessonName) {
        return res.status(400).json({ 
          error: "يرجى توفير جميع المعلومات اللازمة: المستوى التعليمي، المكون الدراسي، واسم الدرس المعني." 
        });
      }

      const ai = getAIClient();

      const levelStr = level === "5" ? "الخامس ابتدائي" : "السادس ابتدائي";
      
      const prompt = `أنت مفتش تربوي مغربي خبير ذو خبرة واسعة في تدريس اللغة العربية لمرحلة الابتدائي. 
صغ سؤالاً تفاعلياً واحداً مبسطاً ومناسباً لتلاميذ الابتدائي في المغرب لدرس [${lessonName}] للمستوى [${levelStr}] في مكون [${component}]. 
صغ السؤال بصيغة اختيار من متعدد مع تحديد الإجابة الصحيحة وخيارين خاطئين بكلمات وجيزة جداً وسهلة الاستيعاب وبلسان عربي فصيح رصين خالٍ من التعقيد، تتماشى تماماً مع المنهاج التربوي المغربي الرسمي وبدون أي رموز تعبيرية (Emojis) نهائياً في النصوص.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              question: { 
                type: Type.STRING, 
                description: "نص السؤال التربوي المطروح بطريقة واضحة ومبسطة" 
              },
              correctAnswer: { 
                type: Type.STRING, 
                description: "الجواب الصحيح بدقة وكلمات قليلة جداً" 
              },
              wrongAnswer1: { 
                type: Type.STRING, 
                description: "الخيار الخاطئ المقترح الأول بكلمات قليلة جداً" 
              },
              wrongAnswer2: { 
                type: Type.STRING, 
                description: "الخيار الخاطئ المقترح الثاني بكلمات قليلة جداً" 
              }
            },
            required: ["question", "correctAnswer", "wrongAnswer1", "wrongAnswer2"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("لم يتم تلقي أي إجابة نصية من نموذج الذكاء الاصطناعي.");
      }

      const parsedData = JSON.parse(responseText.trim());
      res.json({
        success: true,
        data: parsedData
      });
    } catch (error: any) {
      console.error("خطأ أثناء توليد السؤال بواسطة الذكاء الاصطناعي:", error);
      res.status(500).json({ 
        error: error.message || "حدث خطأ غير متوقع أثناء محاولة الاتصال بنموذج الذكاء الاصطناعي." 
      });
    }
  });

  // Serve static assets / Vite files
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
    console.log(`[السيرفر] يعمل الآن بنجاح على المنفذ ${PORT}`);
  });
}

startServer();
