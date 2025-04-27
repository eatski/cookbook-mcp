import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { promises as fs } from "fs";
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
  "レシピから次のタスクを取得する",
  {
  yamlPath: z.string().describe("レシピのYAMLファイルパス（絶対パス）"),
  currentTaskId: z.string().nullable().describe("直前に完了したタスクid レシピを始めた時点ではnull"),
  },
  async ({ yamlPath, currentTaskId }) => {
    const recipeContent = await fs.readFile(yamlPath, "utf-8");
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Example MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
