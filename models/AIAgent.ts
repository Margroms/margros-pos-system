
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function getGroqCompletion(prompt: string) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert business analyst for restaurants. Provide detailed, actionable insights with proper formatting. Always use Indian Rupees (₹) for currency. Format your responses with clear headings using **text** for bold, bullet points with - or •, and maintain professional tone."
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "moonshotai/kimi-k2-instruct", // Using a more capable model
      temperature: 0.3, // Lower temperature for more consistent, factual responses
      max_tokens: 2048, // Allow for longer, more detailed responses
    });

    return completion.choices[0]?.message?.content;
  } catch (error) {
    console.error('Groq API Error:', error);
    return "Unable to generate insights at this time. Please check your API configuration and try again.";
  }
}
