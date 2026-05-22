import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("مفتاح واجهة برمجة التطبيقات GEMINI_API_KEY أو VITE_GEMINI_API_KEY غير متوفر. يرجى تهيئته في لوحة تحكم التطبيق.");
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
    const { level, component, lessonName, count, language } = req.body;

    if (!level || !component || !lessonName) {
      return res.status(400).json({ 
        error: "يرجى توفير جميع المعلومات اللازمة: المستوى التعليمي، المكون الدراسي، واسم الدرس المعني." 
      });
    }

    // Support dynamic requested counts from teacher (like 3, 6, 8, 16...). We put a safe limit of 25.
    const countNum = Math.min(Math.max(parseInt(count) || 1, 1), 25);
    const ai = getAIClient();
    const levelStrNumeric = level === "5" ? "الخامس" : "السادس";

    // Detect language
    let isFrench = false;
    if (language === 'fr') {
      isFrench = true;
    } else if (language === 'ar_vocalized') {
      isFrench = false;
    } else {
      // Auto detect based on the presence of Latin characters in Lesson name or component
      const hasLatin = /[a-zA-Z]/.test(lessonName) || /[a-zA-Z]/.test(component);
      isFrench = hasLatin;
    }

    let prompt = "";

    if (isFrench) {
      const frLevelStr = level === "5" ? "5ème année du primaire" : "6ème année du primaire";
      prompt = `En tant qu'inspecteur pédagogique marocain spécialisé dans l'enseignement de la langue française au primaire, rédigez exactement [${countNum}] questions interactives d'évaluation formative adaptées au niveau de la [${frLevelStr}] au Maroc.
Leçon cible : [${lessonName}]
Matière / Composante : [${component}]

Directives importantes de formulation :
1. Construisez exactement [${countNum}] questions de type QCM (Question à Choix Multiple).
2. Pour chaque question, fournissez :
   - Le texte de la question formulé dans un français impeccable, fluide, instructif et simple d'accès ("question").
   - La réponse correcte directe ("correctAnswer").
   - Deux choix incorrects mais crédibles et pertinents pour les élèves ("wrongAnswer1", "wrongAnswer2").
3. Évitez strictement d'ajouter tout émoticône ou emoji dans les questions et réponses.
4. Les textes doivent être rédigés de manière rigoureuse, soignée et sans aucune coquille grammaticale.`;
    } else {
      const arLevelStr = level === "5" ? "خامس ابتدائي" : "سادس ابتدائي";
      prompt = `أنت مفتش تربوي مغربي خبير ذو خبرة واسعة وطويلة في تدريس اللغة العربية والرياضيات لمرحلة الابتدائي في المغرب. 
صغ عيّنة من [${countNum}] أسئلة تفاعلية ذكية، مبسطة ومناسبة تماماً لتلاميذ الابتدائي في المغرب لدرس [${lessonName}] للمستوى [${arLevelStr}] في مكون [${component}]. 

شروط متلازمة وصارمة للصياغة (Strict Generation & Diacritics Instruction):
1. ولد وصغ بالضبط [${countNum}] أسئلة تعليمية تفاعلية بصيغة اختيار من متعدد.
2. لكل سؤال، يجب توفير:
   - نص السؤال التربوي والتعليمي ("question").
   - الإجابة الصحيحة الدقيقة بكلمات موجزة وملخصة ("correctAnswer").
   - الخيار الخاطئ المقترح الأول بذكاء وموثوقية مضللة للتلميذ ("wrongAnswer1").
   - الخيار الخاطئ المقترح الثاني بذكاء وموثوقية مضللة للتلميذ ("wrongAnswer2").
3. لغة فصيحة وسليمة مشكلة جيداً: يجب أن تكتب جميع الأسئلة والأجوبة بلغة عربية فصيحة، راقية، رصينة، وسليمة 100% من الناحية النحوية والصرفية.
4. التشكيل التام والدقيق (الحركات الإعرابية): يُشدد على كتابة الكلمات مع التشكيل الكامل والمضبوط بالشكل (تنوين، فتح، ضم، كسر، شدة، سكون) لكل حرف في الأسئلة والخيارات لضمان تمكن التلميذ من القراءة الصحيحة والضبط الإعرابي بدون لبس.
5. لا تستخدم ولا تدرج أي رموز تعبيرية (Emojis) في نصوص الأسئلة أو الأجوبة التفاعلية نهائياً.`;
    }

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
      throw new Error("لم يتم تلقي أي إجابة نصية مسموعة من نموذج الذكاء الاصطناعي.");
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
    console.error("خطأ أثناء توليد السؤال بواسطة الذكاء الاصطناعي:", error);
    return res.status(500).json({ 
      error: error.message || "حدث خطأ غير متوقع أثناء محاولة الاتصال بنموذج الذكاء الاصطناعي." 
    });
  }
}
