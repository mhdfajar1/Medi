
import { GoogleGenAI } from "@google/genai";

// NOTE: Ideally, the API key is passed securely or handled via backend proxy.
// For this frontend demo, we check if it exists in env.
const apiKey = process.env.API_KEY || ''; 

export const analyzeMedicalRecord = async (recordDescription: string, recordType: string): Promise<string> => {
  if (!apiKey) {
    return "AI insights are currently unavailable (API Key missing).";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Using gemini-3-flash-preview for high-speed, high-quality text generation
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
        // Updated instruction for concise summary
        systemInstruction: "You are a precise medical assistant. Generate a concise 1-2 sentence summary of the medical record for the patient. Focus strictly on the key clinical facts.",
        temperature: 0.5,
      },
      contents: `
        Summarize this medical record:
        Type: ${recordType}
        Description: "${recordDescription}"
      `,
    });

    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to connect to the AI service. Please try again later.";
  }
};

export const getChatbotResponse = async (userMessage: string, userRole: string = 'User'): Promise<string> => {
  if (!apiKey) return "Helpline is currently offline (API Key missing).";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `You are a helpful, empathetic, and professional 24/7 Medical Helpline Assistant for MediChain. The user is a ${userRole}. Provide general health information, guidance on using the MediChain platform, and suggest seeing a doctor for specific medical advice. Do not provide diagnosis. Keep answers brief (under 50 words) and helpful.`,
        temperature: 0.7,
      },
      contents: userMessage
    });
    return response.text || "I didn't catch that.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "I'm having trouble connecting to the network right now.";
  }
};
