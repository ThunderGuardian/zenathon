import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const createOpenAIAgent = async (instructions) => {
    try {
        const response = await openai.beta.assistants.create({
            name: "AI Agent",
            instructions: instructions,
            tools: [{ type: "code_interpreter" }],
            model: "gpt-4-turbo"
        });

        return response;
    } catch (error) {
        console.error("OpenAI API Error:", error);
        return null;
    }
};

export const getOpenAIInstance = async () => {
    try {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('Failed to retrieve OpenAI API key from database, Please change the key and try again.');
      }
  
      return new OpenAI({ apiKey: apiKey });
    } catch (error) {
      console.error('Error initializing OpenAI instance:', error);
      throw error; 
    }
  };
