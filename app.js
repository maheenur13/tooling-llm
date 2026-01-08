import Groq from "groq-sdk";
import { tavily } from "@tavily/core";

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
//
export async function main() {
  const messages = [
    {
      role: "system",
      content: `You are a smart personal assistant who answers the asked questions. Always respond in a single short sentence. No tables, no bullet points, no markdown formatting.`,
    },

    {
      role: "user",
      content: "When iphone 17 launched?",
    },
  ];
  const chatCompletion = await getGroqChatCompletion(messages);
  console.log(1, chatCompletion.choices[0].message);

  messages.push(chatCompletion.choices[0].message);

  const toolCalls = chatCompletion.choices[0]?.message.tool_calls;
  if (!toolCalls) {
    console.log(`AI: ${chatCompletion.choices[0]?.message.content}`);

    return;
  }
  for (const tool of toolCalls) {
    const functionName = tool.function.name;
    const functionParams = tool.function.arguments;
    console.log(functionParams);

    if (functionName === "web_search") {
      console.log("calling web search...");

      const toolResult = await web_search(JSON.parse(functionParams));

      messages.push({
        tool_call_id: tool.id,
        role: "tool",
        name: functionName,
        content: toolResult,
      });
    }
  }
  const chatCompletion2 = await groq.chat.completions.create({
    temperature: 0,
    messages,
    model: "openai/gpt-oss-20b",
    tools: [
      {
        type: "function",
        function: {
          name: "web_search",
          description: `Search the latest information and realtime data on the internet.`,
          parameters: {
            // JSON Schema object
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query to perform search on.",
              },
            },
            required: ["query"],
          },
        },
      },
    ],
    tool_choice: "auto",
  });
  // const chatCompletion2 = await getGroqChatCompletion(messages);
  console.log(chatCompletion2.choices[0].message.content);

  // Print the completion returned by the LLM.
  // console.log(chatCompletion.choices[0]?.message?.tool_calls);
}

export async function getGroqChatCompletion(messages) {
  return groq.chat.completions.create({
    temperature: 0,
    messages,
    model: "openai/gpt-oss-20b",
    tools: [
      {
        type: "function",
        function: {
          name: "web_search",
          description: `Search the latest information and realtime data on the internet.`,
          parameters: {
            // JSON Schema object
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query to perform search on.",
              },
            },
            required: ["query"],
          },
        },
      },
    ],
    tool_choice: "auto",
  });
}

async function web_search({ query }) {
  const response = await tvly.search(query, {});
  return response.results.map((itm) => itm.content).join("\n\n");
}

// Run the main function
main();
