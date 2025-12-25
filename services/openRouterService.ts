
import { INCOSE_DATA } from '../constants';
import { ChatMessage } from '../types';

export const analyzeRequirementsWithOpenRouter = async (
  apiKey: string,
  modelName: string,
  history: ChatMessage[],
  systemPromptTemplate: string,
  baseUrl: string = "https://routerai.ru/api/v1",
  proxyUrl: string = ''
): Promise<string> => {
  if (!apiKey) throw new Error("RouterAI API Key is missing");

  const ontologyContext = INCOSE_DATA.nodes
    .map(n => `${n.label}: ${n.definition}`)
    .join('\n');

  const systemPrompt = systemPromptTemplate.replace('{ontology_context}', ontologyContext);
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const endpoint = `${cleanBaseUrl}/chat/completions`;
  const url = proxyUrl ? `${proxyUrl}${endpoint}` : endpoint;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ];

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.href, 
        "X-Title": "SysAnalyst AI",
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: 0.2,
      })
    });

    if (!response.ok) {
      if (response.status === 530) throw new Error("RouterAI Error (530): Proxy resolution failed.");
      if (response.status === 401) throw new Error("RouterAI Auth Error (401): Invalid API Key.");
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`RouterAI Error (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response generated.";
  } catch (error: any) {
    throw new Error(error.message || "Failed to analyze requirements with RouterAI");
  }
};
