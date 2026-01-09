import readline from "node:readline/promises";
import Groq from "groq-sdk";
import { tavily } from "@tavily/core";

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
//
export async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const messages = [
    {
      role: "system",
      content: `You are a smart personal assistant who answers the asked questions. You should provide the latest and most recent data from internet. Response should be perfectly formatted, no markdown format. Be polite always.
      Some additional information:
      current datetime: ${new Date().toUTCString()}
      `,
    },
  ];

  while (true) {
    const question = await rl.question("You: ");

    if (question === "bye") {
      break;
    }

    messages.push({
      role: "user",
      content: question,
    });
    while (true) {
      const chatCompletion = await getGroqChatCompletion(messages);

      messages.push(chatCompletion.choices[0].message);

      const toolCalls = chatCompletion.choices[0]?.message.tool_calls;
      if (!toolCalls) {
        console.log(
          `AI Assistant: ${chatCompletion.choices[0]?.message.content}`
        );

        break;
      }
      for (const tool of toolCalls) {
        const functionName = tool.function.name;
        const functionParams = tool.function.arguments;

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
    }
  }

  rl.close();

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
