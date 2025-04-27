import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";

const server = new McpServer({
  name: "cookbook-mcp-server",
  version: "1.0.0",
});

server.tool(
  "get_recipes",
  "レシピ一覧を取得する",
  {
    cookbookPath: z.string().describe("cookbookのディレクトリの絶対パス"),
  },
  async ({ cookbookPath }) => {
    try {
      // 指定されたディレクトリ内のファイル・ディレクトリ一覧を取得
      const entries = await fs.readdir(cookbookPath, { withFileTypes: true });
      
      // ディレクトリのみをフィルタリング
      const directories = entries
        .filter(entry => entry.isDirectory())
        .map(dir => dir.name);
      
      return {
        content: [
          {
            type: "text", 
            text: JSON.stringify(directories)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text", 
            text: `エラー: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
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
