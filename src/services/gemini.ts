import { GoogleGenAI } from "@google/genai";
import { Genre } from "../types";

// सुधार: Vite और GitHub Actions दोनों के सपोर्ट के लिए बैकअप की व्यवस्था
const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  
  if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY is not defined in environment variables!");
  }
  
  return new GoogleGenAI({ apiKey });
};

export const analyzeImageAndGhostwrite = async (base64Image: string, genre: Genre): Promise<string> => {
  try {
    const ai = getAI();
    // गड़बड़ सुधार: 'gemini-3-pro-preview' नाम का कोई मॉडल नहीं है, सही नाम 'gemini-2.5-flash' या 'gemini-2.5-pro' है।
    const model = 'gemini-2.5-flash'; 

    const imageData = base64Image.split(',')[1];
    const mimeType = base64Image.split(';')[0].split(':')[1];

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              data: imageData,
              mimeType: mimeType,
            },
          },
          { text: `Analyze the mood, lighting, and scene of this image. Then, ghostwrite an engaging, highly immersive story opening in the ${genre} genre.` }
        ],
      },
      config: {
        temperature: 0.8,
        topP: 0.95,
      }
    });

    return response.text || "Failed to generate story.";
  } catch (error: any) {
    console.error("Error in analyzeImageAndGhostwrite:", error);
    throw new Error(error.message || "Failed to analyze image.");
  }
};

export const reviseStory = async (base64Image: string, currentParagraph: string, feedback: string, genre: Genre): Promise<string> => {
  try {
    const ai = getAI();
    const model = 'gemini-2.5-flash';

    const imageData = base64Image.split(',')[1];
    const mimeType = base64Image.split(';')[0].split(':')[1];

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              data: imageData,
              mimeType: mimeType,
            },
          },
          {
            text: `The original ${genre} story opening was: "${currentParagraph}". 
            The user wants a revision with the following feedback: "${feedback}". 
            Maintain the initial mood of the image but rewrite the paragraph accordingly.`
          }
        ],
      },
      config: {
        temperature: 0.7,
      }
    });

    return response.text || "Failed to revise story.";
  } catch (error: any) {
    console.error("Error in reviseStory:", error);
    throw new Error(error.message || "Failed to revise story.");
  }
};

export const continueStory = async (base64Image: string, paragraphs: string[], genre: Genre): Promise<string> => {
  try {
    const ai = getAI();
    const model = 'gemini-2.5-flash';

    const imageData = base64Image.split(',')[1];
    const mimeType = base64Image.split(';')[0].split(':')[1];
    const fullStory = paragraphs.join('\n\n');

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              data: imageData,
              mimeType: mimeType,
            },
          },
          {
            text: `Based on the image context, continue the following ${genre} story seamlessly:
            
            ${fullStory}
            
            Write the next paragraph only.`
          }
        ],
      },
      config: {
        temperature: 0.8,
      }
    });

    return response.text || "Failed to continue story.";
  } catch (error: any) {
    console.error("Error in continueStory:", error);
    throw new Error(error.message || "Failed to continue story.");
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  // अगर आपने ऑडियो के लिए अलग लॉजिक लिखा है तो वह यहाँ रहेगा, अन्यथा एक बेसिक मॉक या API रिस्पॉन्स
  return ""; 
};

export const createChatSession = (systemInstruction: string) => {
  const ai = getAI();
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction
    }
  });
};
