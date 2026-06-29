
import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";
import { Genre } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeImageAndGhostwrite = async (base64Image: string, genre: Genre): Promise<string> => {
  const ai = getAI();
  const model = 'gemini-3-pro-preview';
  
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
          text: `Analyze the mood, lighting, and scene of this image. Then, ghostwrite a single, atmospheric opening paragraph (about 100-150 words) for a ${genre} story set in this world. Focus on sensory details, an intriguing tone, and genre-appropriate elements.`,
        },
      ],
    },
    config: {
      temperature: 0.8,
      topP: 0.95,
    }
  });

  return response.text || "Failed to generate story.";
};

export const reviseStory = async (base64Image: string, currentParagraph: string, feedback: string, genre: Genre): Promise<string> => {
  const ai = getAI();
  const model = 'gemini-3-pro-preview';
  
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
          Maintain the initial mood of the image but rewrite the paragraph accordingly.`,
        },
      ],
    },
    config: {
      temperature: 0.7,
    }
  });

  return response.text || "Failed to revise story.";
};

export const continueStory = async (base64Image: string, fullStory: string[], genre: Genre): Promise<string> => {
  const ai = getAI();
  const model = 'gemini-3-pro-preview';
  
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
          text: `Continue the following ${genre} story based on the image mood. 
          The story so far: "${fullStory.join('\n\n')}". 
          Write the next atmospheric paragraph (about 100-150 words).`,
        },
      ],
    },
    config: {
      temperature: 0.8,
    }
  });

  return response.text || "Failed to continue story.";
};

export const generateSpeech = async (text: string): Promise<string> => {
  const ai = getAI();
  const model = 'gemini-2.5-flash-preview-tts';

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: `Read this story paragraph with a dramatic and expressive voice: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Puck' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio returned from Gemini");
  return base64Audio;
};

export const createChatSession = (systemInstruction: string) => {
  const ai = getAI();
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction,
    },
  });
};
