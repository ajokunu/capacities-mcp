<p align="center">
  <img src="https://img.shields.io/badge/MCP-Server-blue?style=for-the-badge" alt="MCP Server">
  <img src="https://img.shields.io/badge/Capacities.io-Integration-purple?style=for-the-badge" alt="Capacities Integration">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
</p>

<h1 align="center">
  <br>
  <pre>
   ____                       _ _   _           __  __  ____ ____
  / ___|__ _ _ __   __ _  ___(_) |_(_) ___  ___|  \/  |/ ___|  _ \
 | |   / _` | '_ \ / _` |/ __| | __| |/ _ \/ __| |\/| | |   | |_) |
 | |__| (_| | |_) | (_| | (__| | |_| |  __/\__ \ |  | | |___|  __/
  \____\__,_| .__/ \__,_|\___|_|\__|_|\___||___/_|  |_|\____|_|
            |_|
  </pre>
  <br>
  Full CRUD MCP Server for Capacities.io
  <br>
</h1>

<p align="center">
  <b>Connect your AI assistant directly to your Capacities knowledge base</b>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-configuration">Configuration</a> •
  <a href="#-available-tools">Tools</a> •
  <a href="#-usage">Usage</a>
</p>

---

## What is this?

**CapacitiesMCP** is a [Model Context Protocol](https://modelcontextprotocol.io/) server that gives AI assistants full access to your [Capacities.io](https://capacities.io) knowledge base.

It bridges the gap between AI and your personal knowledge management system, enabling seamless reading, searching, and creating of content.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Your AI Assistant                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CapacitiesMCP Server                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  REST API (Reads)      │    X-Callback URLs (Writes)    │   │
│  │  • Search & Lookup     │    • Create Objects            │   │
│  │  • Space Info          │    • Open in App               │   │
│  │  • Save Weblinks       │    • Get Current Object        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Capacities.io                             │
│            Your Personal Knowledge Base                         │
└─────────────────────────────────────────────────────────────────┘
```

## Features

| Feature | Method | Description |
|---------|--------|-------------|
| **List Spaces** | REST | View all your Capacities spaces |
| **Search Objects** | REST | Find anything by title |
| **Get Object Types** | REST | Discover available structures |
| **Create Objects** | X-Callback | Create Books, People, Meetings, or any custom type |
| **Save Weblinks** | REST | Clip URLs with tags and notes |
| **Daily Notes** | REST | Append to today's daily note |
| **Open Objects** | X-Callback | Deep-link into specific objects |
| **Get Current** | X-Callback | See what's open in Capacities |

## Installation

### Prerequisites

- Node.js 18+
- A Capacities.io account with API access
- Capacities desktop app (for write operations)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/ajokunu/capacities-mcp.git
cd capacities-mcp

# Install dependencies
npm install

# Build
npm run build
```

## Configuration

### 1. Get Your API Key

1. Open Capacities desktop app
2. Go to **Settings** → **Capacities API**
3. Generate and copy your API key

### 2. Configure Your MCP Client

<details>
<summary><b>Claude Code</b></summary>

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "capacities": {
      "command": "node",
      "args": ["/path/to/capacities-mcp/dist/index.js"],
      "env": {
        "CAPACITIES_API_KEY": "your_api_key_here"
      }
    }
  }
}
```
</details>

<details>
<summary><b>Claude Desktop</b></summary>

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "capacities": {
      "command": "node",
      "args": ["/path/to/capacities-mcp/dist/index.js"],
      "env": {
        "CAPACITIES_API_KEY": "your_api_key_here"
      }
    }
  }
}
```
</details>

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CAPACITIES_API_KEY` | Yes | Your Capacities API key |
| `CAPACITIES_DEFAULT_SPACE_ID` | No | Default space for operations |
| `CAPACITIES_CALLBACK_PORT` | No | Port for x-callback responses (0 = auto) |

## Available Tools

### Read Operations

#### `capacities_list_spaces`
List all spaces you have access to.

#### `capacities_get_space_info`
Get detailed info about a space including structures and collections.

```json
{ "spaceId": "uuid-of-your-space" }
```

#### `capacities_search`
Search for objects by title.

```json
{
  "spaceId": "uuid-of-your-space",
  "searchTerm": "meeting notes"
}
```

#### `capacities_get_object_types`
List all object types (structures) available in a space.

### Write Operations

#### `capacities_create_object`
Create any object type. **Requires Capacities desktop app running.**

```json
{
  "type": "Book",
  "title": "Atomic Habits",
  "content": "Key insights from the book...",
  "tags": ["productivity", "habits"]
}
```

#### `capacities_save_weblink`
Save a URL with metadata.

```json
{
  "spaceId": "uuid",
  "url": "https://example.com/article",
  "title": "Great Article",
  "tags": ["research"]
}
```

#### `capacities_add_to_daily_note`
Append content to today's daily note.

```json
{
  "spaceId": "uuid",
  "content": "## Meeting Summary\n- Discussed roadmap\n- Action items assigned"
}
```

### Utility Operations

#### `capacities_get_current_object`
Get info about the currently open object in Capacities.

#### `capacities_open_object`
Open a specific object by its URL.

## Usage Examples

Once configured, you can ask your AI assistant things like:

> "List all my Capacities spaces"

> "Search for 'project planning' in my work space"

> "Create a new Book called 'Deep Work' with notes about focus techniques"

> "Save this article to my research space with the tags 'AI' and 'productivity'"

> "Add a summary of our conversation to today's daily note"

> "What object do I have open in Capacities right now?"

## Architecture

The server uses a hybrid approach:

- **REST API** (`api.capacities.io`) - For reading data and some write operations (weblinks, daily notes)
- **X-Callback URLs** (`capacities://`) - For creating objects of any type

This combination provides the best coverage of Capacities features while working within API limitations.

## Rate Limits

The server automatically tracks and respects Capacities API rate limits:

| Endpoint | Limit |
|----------|-------|
| `/spaces`, `/space-info` | 5 req/60s |
| `/lookup` | 120 req/60s |
| `/save-weblink` | 10 req/60s |
| `/save-to-daily-note` | 5 req/60s |

## Development

```bash
# Watch mode
npm run dev

# Type checking
npm run typecheck

# Build
npm run build
```

## License

MIT

---

<p align="center">
  <sub>Built for the Capacities and MCP communities</sub>
</p>
