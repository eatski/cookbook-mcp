import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "example-mcp-server",
  version: "1.0.0",
});

server.tool(
  "calc_number",
  "四則演算（加算、減算、乗算、除算）を行う",
  {
    num1: z.number().describe("1つ目の数値"),
    num2: z.number().describe("2つ目の数値"),
    op: z.enum(["add", "subtract", "multiply", "divide"]).describe("演算子（add: 加算, subtract: 減算, multiply: 乗算, divide: 除算）")
  },
  ({num1, num2, op}) => {
    let result: number;
    
    switch (op) {
      case "add":
        result = num1 + num2;
        break;
      case "subtract":
        result = num1 - num2;
        break;
      case "multiply":
        result = num1 * num2;
        break;
      case "divide":
        if (num2 === 0) {
          return {
            content: [{type: "text", text: "エラー: ゼロによる除算はできません"}]
          };
        }
        result = num1 / num2;
        break;
    }
    
    return {content: [{type: "text", text: result.toString()}]};
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Example MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
