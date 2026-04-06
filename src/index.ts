#!/usr/bin/env node
/**
 * Capacities MCP Server
 * A custom MCP server providing full CRUD capabilities for Capacities.io
 *
 * Uses REST API for reads and x-callback-urls for writes
 */

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { CapacitiesRestApi } from './adapters/rest-api.js';
import { CapacitiesXCallback } from './adapters/x-callback.js';

// Configuration
const API_KEY = process.env.CAPACITIES_API_KEY;
const DEFAULT_SPACE_ID = process.env.CAPACITIES_DEFAULT_SPACE_ID;
const CALLBACK_PORT = parseInt(process.env.CAPACITIES_CALLBACK_PORT || '0', 10);

if (!API_KEY) {
  console.error('Error: CAPACITIES_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize adapters
const restApi = new CapacitiesRestApi(API_KEY);
const xCallback = new CapacitiesXCallback({ callbackPort: CALLBACK_PORT });

// Validation helpers
function validateString(value: unknown, name: string, required: boolean = true): string {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new Error(`${name} is required`);
    }
    return '';
  }
  if (typeof value !== 'string') {
    throw new Error(`${name} must be a string`);
  }
  return value;
}

function validateOptionalString(value: unknown, name: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`${name} must be a string`);
  }
  return value;
}

function validateOptionalBoolean(value: unknown, name: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    throw new Error(`${name} must be a boolean`);
  }
  return value;
}

function validateOptionalStringArray(value: unknown, name: string): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== 'string') {
      throw new Error(`${name}[${i}] must be a string`);
    }
  }
  return value as string[];
}

// Tool definitions
const tools: Tool[] = [
  // Read Operations (REST API)
  {
    name: 'capacities_list_spaces',
    description: 'List all Capacities spaces the user has access to. Returns space IDs, titles, and icons.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'capacities_get_space_info',
    description: 'Get detailed information about a Capacities space including available object types (structures), collections, and property definitions.',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId: {
          type: 'string',
          description: 'The UUID of the space to get info for',
        },
      },
      required: ['spaceId'],
    },
  },
  {
    name: 'capacities_search',
    description: 'Search for objects by title in a Capacities space. Returns matching objects with their IDs, structure types, and titles.',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId: {
          type: 'string',
          description: 'The UUID of the space to search in',
        },
        searchTerm: {
          type: 'string',
          description: 'The search term to look for in object titles',
        },
      },
      required: ['spaceId', 'searchTerm'],
    },
  },
  {
    name: 'capacities_get_object_types',
    description: 'Get all available object types (structures) for a space. Useful for knowing what types of objects can be created.',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId: {
          type: 'string',
          description: 'The UUID of the space',
        },
      },
      required: ['spaceId'],
    },
  },

  // Write Operations (Hybrid)
  {
    name: 'capacities_create_object',
    description: 'Create a new object of any type in Capacities. Requires the Capacities desktop app to be running. Can create Books, People, Meetings, or any custom object type defined in the space.',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId: {
          type: 'string',
          description: 'The UUID of the space. Optional - uses active space if omitted.',
        },
        type: {
          type: 'string',
          description: 'The object type name (e.g., "Book", "Meeting", "Person"). Must match the exact singular name of a structure in the space.',
        },
        title: {
          type: 'string',
          description: 'The title of the new object',
        },
        content: {
          type: 'string',
          description: 'Markdown content to add to the object\'s notes section',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to apply to the object (will be added as hashtags in the content)',
        },
      },
      required: ['type', 'title'],
    },
  },
  {
    name: 'capacities_save_weblink',
    description: 'Save a URL/weblink to Capacities with optional metadata, tags, and notes.',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId: {
          type: 'string',
          description: 'The UUID of the space to save the weblink to',
        },
        url: {
          type: 'string',
          description: 'The URL to save',
        },
        title: {
          type: 'string',
          description: 'Optional title for the weblink',
        },
        description: {
          type: 'string',
          description: 'Optional description',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to apply to the weblink',
        },
        content: {
          type: 'string',
          description: 'Markdown notes to add to the weblink',
        },
      },
      required: ['spaceId', 'url'],
    },
  },
  {
    name: 'capacities_add_to_daily_note',
    description: 'Add markdown content to today\'s daily note in Capacities.',
    inputSchema: {
      type: 'object',
      properties: {
        spaceId: {
          type: 'string',
          description: 'The UUID of the space. Uses default space if configured and not provided.',
        },
        content: {
          type: 'string',
          description: 'Markdown content to add to the daily note',
        },
        noTimestamp: {
          type: 'boolean',
          description: 'If true, do not prepend a timestamp to the content',
        },
      },
      required: ['content'],
    },
  },

  // Utility Operations
  {
    name: 'capacities_get_current_object',
    description: 'Get information about the currently open object in Capacities desktop app. Returns the object\'s URL, title, and name. Requires desktop app to be running.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'capacities_open_object',
    description: 'Open a specific object in Capacities by its URL/deeplink.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The Capacities URL/deeplink to open (e.g., capacities://...)',
        },
      },
      required: ['url'],
    },
  },
];

// Tool handlers
async function handleTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    // Read Operations
    case 'capacities_list_spaces': {
      const result = await restApi.listSpaces();
      return {
        spaces: result.spaces,
        count: result.spaces.length,
      };
    }

    case 'capacities_get_space_info': {
      const spaceId = validateString(args.spaceId, 'spaceId');
      const result = await restApi.getSpaceInfo(spaceId);
      return {
        id: result.id,
        title: result.title,
        structures: result.structures.map(s => ({
          id: s.id,
          name: s.title,
          pluralName: s.pluralName,
          propertyCount: s.propertyDefinitions?.length ?? 0,
        })),
        collections: result.collections,
      };
    }

    case 'capacities_search': {
      const spaceId = validateString(args.spaceId, 'spaceId');
      const searchTerm = validateString(args.searchTerm, 'searchTerm');
      const result = await restApi.lookup(spaceId, searchTerm);
      return {
        results: result.results,
        count: result.results.length,
      };
    }

    case 'capacities_get_object_types': {
      const spaceId = validateString(args.spaceId, 'spaceId');
      const structures = await restApi.getObjectTypes(spaceId);
      return {
        types: structures.map(s => ({
          id: s.id,
          name: s.title,
          pluralName: s.pluralName,
          properties: s.propertyDefinitions?.map(p => ({
            name: p.name,
            type: p.type,
          })) ?? [],
        })),
      };
    }

    // Write Operations
    case 'capacities_create_object': {
      const type = validateString(args.type, 'type');
      const title = validateString(args.title, 'title');
      const spaceId = validateOptionalString(args.spaceId, 'spaceId') || DEFAULT_SPACE_ID;
      const content = validateOptionalString(args.content, 'content');
      const tags = validateOptionalStringArray(args.tags, 'tags');

      const result = await xCallback.createObject({
        spaceId,
        type,
        title,
        content,
        tags,
      });
      return result;
    }

    case 'capacities_save_weblink': {
      const spaceId = validateString(args.spaceId, 'spaceId');
      const url = validateString(args.url, 'url');
      const title = validateOptionalString(args.title, 'title');
      const description = validateOptionalString(args.description, 'description');
      const tags = validateOptionalStringArray(args.tags, 'tags');
      const content = validateOptionalString(args.content, 'content');

      const result = await restApi.saveWeblink({
        spaceId,
        url,
        title,
        description,
        tags,
        mdText: content,
      });
      return result;
    }

    case 'capacities_add_to_daily_note': {
      const content = validateString(args.content, 'content');
      const spaceId = validateOptionalString(args.spaceId, 'spaceId') || DEFAULT_SPACE_ID;
      const noTimestamp = validateOptionalBoolean(args.noTimestamp, 'noTimestamp');

      if (!spaceId) {
        throw new Error('spaceId is required (no default space configured)');
      }

      const result = await restApi.saveToDailyNote({
        spaceId,
        mdText: content,
        noTimestamp,
      });
      return result;
    }

    // Utility Operations
    case 'capacities_get_current_object': {
      const result = await xCallback.getCurrentObject();
      return result;
    }

    case 'capacities_open_object': {
      const url = validateString(args.url, 'url');
      const result = await xCallback.openObject(url);
      return result;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Create and run server
async function main() {
  const server = new Server(
    {
      name: 'capacities-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = await handleTool(name, args ?? {});
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: errorMessage }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Capacities MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
