
import { getGroqCompletion } from "./AIAgent";

export async function getInventorySuggestions(prompt: string) {
  const fullPrompt = `The user is asking for inventory suggestions. Here is their query: "${prompt}". Provide a list of items that are low in stock and should be reordered.`;
  return await getGroqCompletion(fullPrompt);
}
