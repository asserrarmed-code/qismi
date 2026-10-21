import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

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

    // Support dynamic requested counts from teacher (like 3, 6, 8, 16...). Safe cap at 25.
    const countNum = Math.min(Math.max(parseInt(count) || 1, 1), 25);
    const ai = getAIClient();

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

    // List of candidate models to try in sequence for resilience against high-demand / quota spikes
    const candidateModels = [
      "gemini-3.1-flash-lite", // Extremely fast, lightweight, high capacity, avoids high-demand spikes
      "gemini-3.8-flash",      // Next generation flash model (with LOW thinking level)
      "gemini-flash-latest"    // Fallback alias
    ];

    let questionsArray: any[] = [];
    let lastError: any = null;

    for (let i = 0; i < candidateModels.length; i++) {
      const modelName = candidateModels[i];
      try {
        console.log(`[AI Generator] Attempting question generation with model: ${modelName}`);

        const config: any = {
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
        };

        if (modelName === "gemini-3.8-flash") {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: config,
        });

        const responseText = response.text;
        if (!responseText) {
          throw new Error("لم يتم تلقي أي إجابة نصية من نموذج الذكاء الاصطناعي.");
        }

        let cleanJson = responseText.trim();
        if (cleanJson.startsWith("```json")) {
          cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (cleanJson.startsWith("```")) {
          cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        const parsedData = JSON.parse(cleanJson);
        if (parsedData.questions && Array.isArray(parsedData.questions)) {
          questionsArray = parsedData.questions;
        } else if (Array.isArray(parsedData)) {
          questionsArray = parsedData;
        } else if (parsedData && typeof parsedData === 'object') {
          questionsArray = [parsedData];
        }

        if (questionsArray && questionsArray.length > 0) {
          console.log(`[AI Generator] Successfully generated ${questionsArray.length} questions using ${modelName}`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI Generator] Model ${modelName} encountered an error:`, err?.message || err);
        const errMsg = (err?.message || "").toLowerCase();
        const isTemporary = errMsg.includes("high demand") || errMsg.includes("503") || errMsg.includes("unavailable") || errMsg.includes("429");
        if (isTemporary && i < candidateModels.length - 1) {
          // Brief pause before trying next model
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }
    }

    if (!questionsArray || questionsArray.length === 0) {
      const errMsg = (lastError?.message || "").toLowerCase();
      if (errMsg.includes("high demand") || errMsg.includes("503") || errMsg.includes("unavailable") || errMsg.includes("capacity")) {
        throw new Error("خوادم الذكاء الاصطناعي (Google Gemini) تشهد ضغطاً مؤقتاً مرتفعاً (High Demand). يرجى الضغط على زر إعادة المحاولة الآن وسيتولى النظام التبديل التلقائي إلى نموذج فوري.");
      }
      throw lastError || new Error("فشلت عملية توليد الأسئلة عبر النماذج المتوفرة.");
    }

    return res.status(200).json({
      success: true,
      data: questionsArray
    });
  } catch (error: any) {
    console.error("خطأ أثناء توليد السؤال بواسطة الذكاء الاصطناعي:", error);
    let finalError = error.message || "حدث خطأ غير متوقع أثناء محاولة الاتصال بنموذج الذكاء الاصطناعي.";
    if (finalError.toLowerCase().includes("high demand") || finalError.toLowerCase().includes("503") || finalError.toLowerCase().includes("unavailable")) {
      finalError = "خوادم الذكاء الاصطناعي (Google Gemini) تشهد ضغطاً مؤقتاً مرتفعاً (High Demand). يرجى الضغط على زر إعادة المحاولة الآن أو الانتظار للحظات قليلة.";
    }
    return res.status(500).json({ 
      error: finalError 
    });
  }
}
