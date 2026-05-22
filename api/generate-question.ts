import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("مفتاح واجهة برمجة التطبيقات GEMINI_API_KEY أو VITE_GEMINI_API_KEY غير متوفر. يرجى تهيئته في لوحة تحكم Vercel.");
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

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'الطريقة المستخدمة غير مدعومة، يرجى استخدام POST.' });
  }

  try {
    const { level, component, lessonName, count } = req.body;

    if (!level || !component || !lessonName) {
      return res.status(400).json({ 
        error: "يرجى توفير جميع المعلومات اللازمة: المستوى التعليمي، المكون الدراسي، واسم الدرس المعني." 
      });
    }

    const countNum = Math.min(Math.max(parseInt(count) || 1, 1), 5);
    const ai = getAIClient();
    const levelStr = level === "5" ? "الخامس ابتدائي" : "السادس ابتدائي";
    
    const prompt = `أنت مفتش تربوي مغربي خبير ذو خبرة واسعة في تدريس اللغة العربية لمرحلة الابتدائي. 
صغ عيّنة من [${countNum}] أسئلة تفاعلية مبسطة ومناسبة تماماً لتلاميذ الابتدائي في المغرب لدرس [${lessonName}] للمستوى [${levelStr}] في مكون [${component}]. 
صغ كل سؤال بصيغة اختيار من متعدد مع تحديد الإجابة الصحيحة وخيارين خاطئين بكلمات وجيزة جداً وسهلة الاستيعاب وبلسان عربي فصيح رصين خالٍ من التعقيد، تتماشى تماماً مع المنهاج التربوي المغربي الرسمي وبدون أي رموز تعبيرية (Emojis) نهائياً في النصوص.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              description: "قائمة الأسئلة التفاعلية المولدة",
              items: {
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
              }
            }
          },
          required: ["questions"],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("لم يتم تلقي أي إجابة نصية من نموذج الذكاء الاصطناعي.");
    }

    const parsedData = JSON.parse(responseText.trim());
    let questionsArray = [];
    if (parsedData.questions && Array.isArray(parsedData.questions)) {
      questionsArray = parsedData.questions;
    } else if (Array.isArray(parsedData)) {
      questionsArray = parsedData;
    } else {
      questionsArray = [parsedData];
    }

    return res.status(200).json({
      success: true,
      data: questionsArray
    });
  } catch (error: any) {
    console.error("خطأ أثناء توليد السؤال بواسطة الذكاء الاصطناعي برابط Vercel:", error);
    return res.status(500).json({ 
      error: error.message || "حدث خطأ غير متوقع أثناء محاولة الاتصال بنموذج الذكاء الاصطناعي." 
    });
  }
}
