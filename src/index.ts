import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Define tools
const TOOLS: Record<string, Tool> = {
  // Tool to get the current time
  getCurrentTime: {
    name: 'getCurrentTime',
    description: 'Get the current time in a specified format',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          description: 'The format to return the time in (e.g., "iso", "locale")',
          default: 'iso'
        },
        timezone: {
          type: 'string',
          description: 'The timezone to use (e.g., "UTC", "America/New_York")',
          default: 'UTC'
        }
      },
      additionalProperties: false
    },
  },
  
  // Tool to calculate something
  calculate: {
    name: 'calculate',
    description: 'Perform a simple calculation',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          description: 'The operation to perform (add, subtract, multiply, divide)',
          enum: ['add', 'subtract', 'multiply', 'divide']
        },
        a: {
          type: 'number',
          description: 'First number'
        },
        b: {
          type: 'number',
          description: 'Second number'
        }
      },
      required: ['operation', 'a', 'b'],
      additionalProperties: false
    },
  }
};

// Create MCP server
const mcpServer = new Server(
  {
    name: 'simple-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Set up tool handlers
const setupToolHandlers = (server: Server) => {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Object.values(TOOLS),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = TOOLS[request.params.name];
    if (!tool) {
      throw new Error(`Tool not found: ${request.params.name}`);
    }

    // Handle specific tool implementations
    if (request.params.name === 'getCurrentTime') {
      const format = (request.params.arguments?.format as string) || 'iso';
      const timezone = (request.params.arguments?.timezone as string) || 'UTC';
      
      const date = new Date();
      
      let formattedTime: string;
      if (format === 'iso') {
        formattedTime = date.toISOString();
      } else if (format === 'locale') {
        formattedTime = date.toLocaleString('en-US', { timeZone: timezone });
      } else {
        formattedTime = date.toString();
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              time: formattedTime,
              timezone: timezone
            }),
          },
        ],
      };
    }
    
    if (request.params.name === 'calculate') {
      const operation = request.params.arguments?.operation as string;
      const a = request.params.arguments?.a as number;
      const b = request.params.arguments?.b as number;
      
      let result: number;
      
      switch (operation) {
        case 'add':
          result = a + b;
          break;
        case 'subtract':
          result = a - b;
          break;
        case 'multiply':
          result = a * b;
          break;
        case 'divide':
          if (b === 0) {
            throw new Error('Cannot divide by zero');
          }
          result = a / b;
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              operation,
              a,
              b,
              result
            }),
          },
        ],
      };
    }
    
    throw new Error('Tool implementation not found');
  });
};

console.error('Simple MCP Server starting...');
setupToolHandlers(mcpServer);
console.error('Simple MCP Server started');

async function runServer() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('Simple MCP Server running on stdio');
}

runServer().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
