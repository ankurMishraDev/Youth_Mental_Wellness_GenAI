/**
 * Vertex AI (Gemini) Client Configuration
 * For use in Next.js API routes
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Get a Gemini model instance
 */
export function getModel(modelName: string = 'gemini-pro') {
  return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Generate content using Gemini
 */
export async function generateContent(prompt: string, modelName: string = 'gemini-pro') {
  const model = getModel(modelName);
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

/**
 * Generate content with structured output (JSON)
 */
export async function generateStructuredContent<T = any>(
  prompt: string,
  schema?: string,
  modelName: string = 'gemini-pro'
): Promise<T> {
  const model = getModel(modelName);
  
  let fullPrompt = prompt;
  if (schema) {
    fullPrompt += `\n\nRespond in JSON format following this schema:\n${schema}`;
  }
  
  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  const text = response.text();
  
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in response');
  }
  
  return JSON.parse(jsonMatch[0]) as T;
}

export default genAI;
