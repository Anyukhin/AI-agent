
import { INCOSE_DATA } from '../constants';
import { ChatMessage } from '../types';

const getAccessToken = async (authKey: string, proxyUrl: string): Promise<string> => {
  const uuid = crypto.randomUUID();
  const targetUrl = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
  const url = proxyUrl ? `${proxyUrl}${targetUrl}` : targetUrl;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authKey}`,
        "RqUID": uuid,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "scope=GIGACHAT_API_PERS"
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Auth Failed (${response.status}): ${text}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error: any) {
    throw new Error(`Failed to authenticate with GigaChat: ${error.message}`);
  }
};

export const analyzeRequirementsWithGigaChat = async (
  apiKey: string,
  modelName: string,
  history: ChatMessage[],
  systemPromptTemplate: string,
  proxyUrl: string = ''
): Promise<string> => {
  if (!apiKey) throw new Error("GigaChat API Key is missing");

  const ontologyContext = INCOSE_DATA.nodes
    .map(n => `${n.label}: ${n.definition}`)
    .join('\n');

  const systemPrompt = systemPromptTemplate.replace('{ontology_context}', ontologyContext);

  try {
    const accessToken = await getAccessToken(apiKey, proxyUrl);
    const targetUrl = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions";
    const url = proxyUrl ? `${proxyUrl}${targetUrl}` : targetUrl;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(msg => ({ role: msg.role, content: msg.content }))
        ],
        temperature: 0.2,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`GigaChat API Error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response generated.";
  } catch (error: any) {
    throw new Error(error.message || "Failed to analyze requirements with GigaChat");
  }
};
