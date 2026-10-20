var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
import_dotenv.default.config();
var PORT = 3e3;
var aiClient = null;
function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("\u0645\u0641\u062A\u0627\u062D \u0648\u0627\u062C\u0647\u0629 \u0628\u0631\u0645\u062C\u0629 \u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A GEMINI_API_KEY \u0623\u0648 VITE_GEMINI_API_KEY \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631. \u064A\u0631\u062C\u0649 \u062A\u0647\u064A\u0626\u062A\u0647 \u0639\u0628\u0631 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0646\u0635\u0629.");
  }
  if (!aiClient) {
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
async function startServer() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json());
  app.post("/api/generate-question", async (req, res) => {
    try {
      const { level, component, lessonName, count, language } = req.body;
      if (!level || !component || !lessonName) {
        return res.status(400).json({
          error: "\u064A\u0631\u062C\u0649 \u062A\u0648\u0641\u064A\u0631 \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0644\u0627\u0632\u0645\u0629: \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A\u060C \u0627\u0644\u0645\u0643\u0648\u0646 \u0627\u0644\u062F\u0631\u0627\u0633\u064A\u060C \u0648\u0627\u0633\u0645 \u0627\u0644\u062F\u0631\u0633 \u0627\u0644\u0645\u0639\u0646\u064A."
        });
      }
      const countNum = Math.min(Math.max(parseInt(count) || 1, 1), 25);
      const ai = getAIClient();
      let isFrench = false;
      if (language === "fr") {
        isFrench = true;
      } else if (language === "ar_vocalized") {
        isFrench = false;
      } else {
        const hasLatin = /[a-zA-Z]/.test(lessonName) || /[a-zA-Z]/.test(component);
        isFrench = hasLatin;
      }
      let prompt = "";
      if (isFrench) {
        const frLevelStr = level === "5" ? "5\xE8me ann\xE9e du primaire" : "6\xE8me ann\xE9e du primaire";
        prompt = `En tant qu'inspecteur p\xE9dagogique marocain sp\xE9cialis\xE9 dans l'enseignement de la langue fran\xE7aise au primaire, r\xE9digez exactement [${countNum}] questions interactives d'\xE9valuation formative adapt\xE9es au niveau de la [${frLevelStr}] au Maroc.
Le\xE7on cible : [${lessonName}]
Mati\xE8re / Composante : [${component}]

Directives importantes de formulation :
1. Construisez exactement [${countNum}] questions de type QCM (Question \xE0 Choix Multiple).
2. Pour chaque question, fournissez :
   - Le texte de la question formul\xE9 dans un fran\xE7ais impeccable, fluide, instructif et simple d'acc\xE8s ("question").
   - La r\xE9ponse correcte directe ("correctAnswer").
   - Deux choix incorrects mais cr\xE9dibles et pertinents pour les \xE9l\xE8ves ("wrongAnswer1", "wrongAnswer2").
3. \xC9vitez strictement d'ajouter tout \xE9motic\xF4ne ou emoji dans les questions et r\xE9ponses.
4. Les textes doivent \xEAtre r\xE9dig\xE9s de mani\xE8re rigoureuse, soign\xE9e et sans aucune coquille grammaticale.`;
      } else {
        const arLevelStr = level === "5" ? "\u062E\u0627\u0645\u0633 \u0627\u0628\u062A\u062F\u0627\u0626\u064A" : "\u0633\u0627\u062F\u0633 \u0627\u0628\u062A\u062F\u0627\u0626\u064A";
        prompt = `\u0623\u0646\u062A \u0645\u0641\u062A\u0634 \u062A\u0631\u0628\u0648\u064A \u0645\u063A\u0631\u0628\u064A \u062E\u0628\u064A\u0631 \u0630\u0648 \u062E\u0628\u0631\u0629 \u0648\u0627\u0633\u0639\u0629 \u0648\u0637\u0648\u064A\u0644\u0629 \u0641\u064A \u062A\u062F\u0631\u064A\u0633 \u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0648\u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0627\u062A \u0644\u0645\u0631\u062D\u0644\u0629 \u0627\u0644\u0627\u0628\u062A\u062F\u0627\u0626\u064A \u0641\u064A \u0627\u0644\u0645\u063A\u0631\u0628. 
\u0635\u063A \u0639\u064A\u0651\u0646\u0629 \u0645\u0646 [${countNum}] \u0623\u0633\u0626\u0644\u0629 \u062A\u0641\u0627\u0639\u0644\u064A\u0629 \u0630\u0643\u064A\u0629\u060C \u0645\u0628\u0633\u0637\u0629 \u0648\u0645\u0646\u0627\u0633\u0628\u0629 \u062A\u0645\u0627\u0645\u0627\u064B \u0644\u062A\u0644\u0627\u0645\u064A\u0630 \u0627\u0644\u0627\u0628\u062A\u062F\u0627\u0626\u064A \u0641\u064A \u0627\u0644\u0645\u063A\u0631\u0628 \u0644\u062F\u0631\u0633 [${lessonName}] \u0644\u0644\u0645\u0633\u062A\u0648\u0649 [${arLevelStr}] \u0641\u064A \u0645\u0643\u0648\u0646 [${component}]. 

\u0634\u0631\u0648\u0637 \u0645\u062A\u0644\u0627\u0632\u0645\u0629 \u0648\u0635\u0627\u0631\u0645\u0629 \u0644\u0644\u0635\u064A\u0627\u063A\u0629:
1. \u0648\u0644\u062F \u0648\u0635\u063A \u0628\u0627\u0644\u0636\u0628\u0637 [${countNum}] \u0623\u0633\u0626\u0644\u0629 \u062A\u0639\u0644\u064A\u0645\u064A\u0629 \u062A\u0641\u0627\u0639\u0644\u064A\u0629 \u0628\u0635\u064A\u063A\u0629 \u0627\u062E\u062A\u064A\u0627\u0631 \u0645\u0646 \u0645\u062A\u0639\u062F\u062F.
2. \u0644\u0643\u0644 \u0633\u0624\u0627\u0644\u060C \u064A\u062C\u0628 \u062A\u0648\u0641\u064A\u0631:
   - \u0646\u0635 \u0627\u0644\u0633\u0624\u0627\u0644 \u0627\u0644\u062A\u0631\u0628\u0648\u064A \u0648\u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A ("question").
   - \u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0627\u0644\u0635\u062D\u064A\u062D\u0629 \u0627\u0644\u062F\u0642\u064A\u0642\u0629 \u0628\u0643\u0644\u0645\u0627\u062A \u0645\u0648\u062C\u0632\u0629 \u0648\u0645\u0644\u062E\u0635\u0629 ("correctAnswer").
   - \u0627\u0644\u062E\u064A\u0627\u0631 \u0627\u0644\u062E\u0627\u0637\u0626 \u0627\u0644\u0645\u0642\u062A\u0631\u062D \u0627\u0644\u0623\u0648\u0644 \u0628\u0630\u0643\u0627\u0621 \u0648\u0645\u0648\u062B\u0648\u0642\u064A\u0629 \u0645\u0636\u0644\u0644\u0629 \u0644\u0644\u062A\u0644\u0645\u064A\u0630 ("wrongAnswer1").
   - \u0627\u0644\u062E\u064A\u0627\u0631 \u0627\u0644\u062E\u0627\u0637\u0626 \u0627\u0644\u0645\u0642\u062A\u0631\u062D \u0627\u0644\u062B\u0627\u0646\u064A \u0628\u0630\u0643\u0627\u0621 \u0648\u0645\u0648\u062B\u0648\u0642\u064A\u0629 \u0645\u0636\u0644\u0644\u0629 \u0644\u0644\u062A\u0644\u0645\u064A\u0630 ("wrongAnswer2").
3. \u0644\u063A\u0629 \u0641\u0635\u064A\u062D\u0629 \u0648\u0633\u0644\u064A\u0645\u0629 \u0645\u0634\u0643\u0644\u0629 \u062C\u064A\u062F\u0627\u064B: \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u062A\u0628 \u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0648\u0627\u0644\u0623\u062C\u0648\u0628\u0629 \u0628\u0644\u063A\u0629 \u0639\u0631\u0628\u064A\u0629 \u0641\u0635\u064A\u062D\u0629 \u0648\u0633\u0644\u064A\u0645\u0629 100% \u0645\u0639 \u0627\u0644\u062A\u0634\u0643\u064A\u0644 \u0627\u0644\u062A\u0627\u0645 \u0644\u0644\u0643\u0644\u0645\u0627\u062A.
4. \u0644\u0627 \u062A\u0633\u062A\u062E\u062F\u0645 \u0648\u0644\u0627 \u062A\u062F\u0631\u062C \u0623\u064A \u0631\u0645\u0648\u0632 \u062A\u0639\u0628\u064A\u0631\u064A\u0629 (Emojis) \u0646\u0647\u0627\u0626\u064A\u0627\u064B.`;
      }
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              questions: {
                type: import_genai.Type.ARRAY,
                description: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A\u0629 \u0627\u0644\u0645\u0648\u0644\u062F\u0629",
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    question: {
                      type: import_genai.Type.STRING,
                      description: "\u0646\u0635 \u0627\u0644\u0633\u0624\u0627\u0644 \u0627\u0644\u062A\u0631\u0628\u0648\u064A \u0627\u0644\u0645\u0637\u0631\u0648\u062D \u0628\u0637\u0631\u064A\u0642\u0629 \u0648\u0627\u0636\u062D\u0629 \u0648\u0645\u0628\u0633\u0637\u0629"
                    },
                    correctAnswer: {
                      type: import_genai.Type.STRING,
                      description: "\u0627\u0644\u062C\u0648\u0627\u0628 \u0627\u0644\u0635\u062D\u064A\u062D \u0628\u062F\u0642\u0629 \u0648\u0643\u0644\u0645\u0627\u062A \u0642\u0644\u064A\u0644\u0629 \u062C\u062F\u0627\u064B"
                    },
                    wrongAnswer1: {
                      type: import_genai.Type.STRING,
                      description: "\u0627\u0644\u062E\u064A\u0627\u0631 \u0627\u0644\u062E\u0627\u0637\u0626 \u0627\u0644\u0645\u0642\u062A\u0631\u062D \u0627\u0644\u0623\u0648\u0644 \u0628\u0643\u0644\u0645\u0627\u062A \u0642\u0644\u064A\u0644\u0629 \u062C\u062F\u0627\u064B"
                    },
                    wrongAnswer2: {
                      type: import_genai.Type.STRING,
                      description: "\u0627\u0644\u062E\u064A\u0627\u0631 \u0627\u0644\u062E\u0627\u0637\u0626 \u0627\u0644\u0645\u0642\u062A\u0631\u062D \u0627\u0644\u062B\u0627\u0646\u064A \u0628\u0643\u0644\u0645\u0627\u062A \u0642\u0644\u064A\u0644\u0629 \u062C\u062F\u0627\u064B"
                    }
                  },
                  required: ["question", "correctAnswer", "wrongAnswer1", "wrongAnswer2"]
                }
              }
            },
            required: ["questions"]
          }
        }
      });
      const responseText = response.text;
      if (!responseText) {
        throw new Error("\u0644\u0645 \u064A\u062A\u0645 \u062A\u0644\u0642\u064A \u0623\u064A \u0625\u062C\u0627\u0628\u0629 \u0646\u0635\u064A\u0629 \u0645\u0646 \u0646\u0645\u0648\u0630\u062C \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.");
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
      res.json({
        success: true,
        data: questionsArray
      });
    } catch (error) {
      console.error("\u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u0648\u0644\u064A\u062F \u0627\u0644\u0633\u0624\u0627\u0644 \u0628\u0648\u0627\u0633\u0637\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A:", error);
      res.status(500).json({
        error: error.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u062A\u0648\u0642\u0639 \u0623\u062B\u0646\u0627\u0621 \u0645\u062D\u0627\u0648\u0644\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0646\u0645\u0648\u0630\u062C \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A."
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[\u0627\u0644\u0633\u064A\u0631\u0641\u0631] \u064A\u0639\u0645\u0644 \u0627\u0644\u0622\u0646 \u0628\u0646\u062C\u0627\u062D \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u0641\u0630 ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
