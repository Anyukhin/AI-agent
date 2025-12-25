import { GoogleGenAI } from "@google/genai";
import { INCOSE_DATA } from '../constants';

/**
 * Analyzes requirements using Google Gemini API.
 * Follows the latest @google/genai SDK patterns.
 */
export const analyzeRequirementsWithGemini = async (
  modelName: string,
  requirements: string,
  systemPromptTemplate: string
): Promise<string> => {
  // Flatten the ontology data into text context
  const ontologyContext = INCOSE_DATA.nodes
    .map(n => `${n.label}: ${n.definition}`)
    .join('\n');

  const systemPrompt = systemPromptTemplate.replace('{ontology_context}', ontologyContext);

  // Initialize with named parameter object as per guidelines.
  // Using process.env.API_KEY directly is a requirement.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: requirements,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
      },
    });

    // Extract text output from GenerateContentResponse as a property access.
    return response.text || "No response generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to analyze requirements");
  }
};