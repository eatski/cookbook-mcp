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
  "get_next_task",
  "次のタスクを取得する",
  {
    cookbookPath: z.string().describe("cookbookのディレクトリの絶対パス"),
    recipeName: z.string().describe("レシピ名"),
    currentTaskId: z.string().nullable().describe("直前に完了したタスクid レシピを始めた時点ではnull"),
  },
  async ({ recipeName, cookbookPath, currentTaskId: currentTaskName }) => {
    const recipePath = path.join(cookbookPath, recipeName);
    const tasks = await fs.readdir(recipePath, { withFileTypes: true });
    const taskSortedByName = tasks
      .filter(entry => entry.isFile())
      .sort((a, b) => a.name.localeCompare(b.name));

    const currentTaskIndex = taskSortedByName.findIndex(task => task.name === currentTaskName);

    const nextTaskIndex = currentTaskIndex + 1;
    const nextTask = taskSortedByName[nextTaskIndex];
    if (!nextTask) {
      return {
        content: [
          {
            type: "text",
            text: "次のタスクはありません。"
          }
        ]
      };
    }
    const nextTaskPath = path.join(recipePath, nextTask.name);
    const nextTaskContent = await fs.readFile(nextTaskPath, "utf-8");
    return {
      content: [
        {
          type: "text",
          text: `
          タスクid:
          ${nextTask.name}
          次のタスク: 
          ${nextTaskContent}

          完了した場合、次のタスクを get_next_task で取得してください。
          `
        }
      ]
    };
  }
)

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
