
import { getGroqCompletion } from "./AIAgent";

export async function getMenuSuggestions(prompt: string) {
  const fullPrompt = `The user is asking for menu suggestions. Here is their query: "${prompt}". Provide a list of new menu items with descriptions.`;
  return await getGroqCompletion(fullPrompt);
}
