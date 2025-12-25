import { INCOSE_DATA } from '../constants';

export const analyzeRequirementsWithOpenRouter = async (
  apiKey: string,
  modelName: string,
  requirements: string,
  systemPromptTemplate: string,
  baseUrl: string = "https://routerai.ru/api/v1",
  proxyUrl: string = ''
): Promise<string> => {
  if (!apiKey) throw new Error("RouterAI API Key is missing");

  // Flatten the ontology data into text context
  const ontologyContext = INCOSE_DATA.nodes
    .map(n => `${n.label}: ${n.definition}`)
    .join('\n');

  const systemPrompt = systemPromptTemplate.replace('{ontology_context}', ontologyContext);

  // Ensure baseUrl doesn't end with a slash for consistency
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const endpoint = `${cleanBaseUrl}/chat/completions`;
  
  // FIX: Do not encode the endpoint for corsproxy.io. 
  // Error 530 often occurs when the proxy receives an encoded URL it cannot resolve.
  const url = proxyUrl ? `${proxyUrl}${endpoint}` : endpoint;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // REQUIRED: RouterAI/OpenRouter often require these to identify the client source
        "HTTP-Referer": window.location.href, 
        "X-Title": "SysAnalyst AI",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: requirements
          }
        ],
        temperature: 0.2,
      })
    });

    if (!response.ok) {
      let errorMessage = `RouterAI Error (${response.status})`;
      
      // Handle Cloudflare/Proxy 530 specifically
      if (response.status === 530) {
        throw new Error(`RouterAI Error (530): The Proxy could not resolve the RouterAI server (${cleanBaseUrl}). Check the 'API Base URL' in Settings or try a different Proxy.`);
      }
      
      if (response.status === 401) {
         throw new Error("RouterAI Auth Error (401): Invalid API Key. Please check your key in Settings.");
      }

      try {
        const errorData = await response.json();
        if (errorData.error && errorData.error.message) {
          errorMessage += `: ${errorData.error.message}`;
        } else {
          errorMessage += `: ${JSON.stringify(errorData)}`;
        }
      } catch (e) {
        errorMessage += `: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response generated.";
  } catch (error: any) {
    console.error("RouterAI Service Error:", error);
    
    // Handle Network/CORS errors
    if (error.message === "Failed to fetch" || error.name === "TypeError") {
      if (proxyUrl) {
         throw new Error("Network Error: The Proxy failed to connect or was blocked. Try clearing the Proxy in Settings.");
      } else {
         throw new Error("Network Error: Direct connection failed (CORS). RouterAI blocks browser requests. Please enable a CORS Proxy in Settings (e.g., https://corsproxy.io/?).");
      }
    }
    
    throw new Error(error.message || "Failed to analyze requirements with RouterAI");
  }
};