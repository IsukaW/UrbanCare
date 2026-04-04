const { GoogleGenerativeAI } = require('@google/generative-ai');
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');
const logger = require('../config/logger');

const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);

const analyseSymptoms = async (symptoms) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
You are a medical assistant AI. A patient has reported the following symptoms:
${symptoms.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Based on these symptoms, provide:
1. Possible health conditions (list up to 3, brief explanation for each)
2. Recommended doctor specialties to consult (list up to 3)
3. General health advice

Respond ONLY in the following JSON format with no extra text:
{
  "possibleConditions": [
    { "name": "condition name", "description": "brief explanation" }
  ],
  "recommendedSpecialties": [
    { "specialty": "specialty name", "reason": "why this specialty" }
  ],
  "generalAdvice": "brief general health advice"
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      symptoms,
      possibleConditions: parsed.possibleConditions || [],
      recommendedSpecialties: parsed.recommendedSpecialties || [],
      generalAdvice: parsed.generalAdvice || '',
      disclaimer:
        'This is an AI-generated preliminary assessment only. ' +
        'Please consult a qualified healthcare professional for proper diagnosis and treatment.'
    };
  } catch (err) {
    logger.error({ err }, 'Gemini API error');

    if (err instanceof SyntaxError) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to parse AI response. Please try again.'
      );
    }
    throw new ApiError(
      StatusCodes.BAD_GATEWAY,
      err.message || 'Failed to connect to AI service. Please try again later.'
    );
  }
};

module.exports = { analyseSymptoms };