import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { parse } from "yaml";

const RecipeSchema = z.object({
  description: z.string(),
  tasks: z.array(z.string())
});

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
  async ({ recipeName, cookbookPath, currentTaskId }) => {
    const recipePath = path.join(cookbookPath, recipeName);
    const recipeContent = await fs.readFile(recipePath, "utf-8");
    const parsedRecipe = parse(recipeContent);
    const recipe = RecipeSchema.parse(parsedRecipe);
    
    const currentTaskIndex = currentTaskId ? parseInt(currentTaskId) : -1;
    const nextTaskIndex = currentTaskIndex + 1;
    const nextTask = recipe.tasks[nextTaskIndex];

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
    return {
      content: [
        {
          type: "text",
          text: `
          タスクid:
          ${nextTaskIndex}
          次のタスク: 
          ${nextTask}

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
      const entries = await fs.readdir(cookbookPath, { withFileTypes: true });
      const recipes = [];

      // ファイルを読み込んでパースを試みる
      for (const entry of entries.filter(entry => entry.isFile())) {
        try {
          const content = await fs.readFile(path.join(cookbookPath, entry.name), 'utf-8');
          const recipe = RecipeSchema.parse(parse(content));
          recipes.push({
            name: entry.name,
            description: recipe.description
          });
        } catch {
          // パースに失敗した場合はスキップ
          continue;
        }
      }
      
      return {
        content: [
          {
            type: "text", 
            text: JSON.stringify(recipes)
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
