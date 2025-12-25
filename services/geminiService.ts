
import { GoogleGenAI } from "@google/genai";
import { INCOSE_DATA } from '../constants';
import { ChatMessage } from '../types';

/**
 * Analyzes requirements using Google Gemini API with conversation history.
 */
export const analyzeRequirementsWithGemini = async (
  modelName: string,
  history: ChatMessage[],
  systemPromptTemplate: string
): Promise<string> => {
  const ontologyContext = INCOSE_DATA.nodes
    .map(n => `${n.label}: ${n.definition}`)
    .join('\n');

  const systemPrompt = systemPromptTemplate.replace('{ontology_context}', ontologyContext);

  // Use process.env.API_KEY directly and use named parameter for apiKey.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Map our history to Gemini format (user/model)
  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
      },
    });

    // Extract text output using the .text property as per guidelines.
    return response.text || "No response generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to analyze requirements");
  }
};
