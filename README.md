<p align="center">
  <img src="https://img.shields.io/badge/MCP-Server-blue?style=for-the-badge" alt="MCP Server">
  <img src="https://img.shields.io/badge/Capacities.io-Integration-purple?style=for-the-badge" alt="Capacities Integration">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
</p>

<h1 align="center">

```
╔═╗┌─┐┌─┐┌─┐┌─┐┬┌┬┐┬┌─┐┌─┐
║  ├─┤├─┘├─┤│  │ │ │├┤ └─┐
╚═╝┴ ┴┴  ┴ ┴└─┘┴ ┴ ┴└─┘└─┘
         ╔╦╗╔═╗╔═╗
         ║║║║  ╠═╝
         ╩ ╩╚═╝╩
```

**MCP Server for Capacities.io**

</h1>

<p align="center">
  <b>Search, create, and organize content in your Capacities knowledge base via AI</b>
</p>

---

## Important Limitations

> **The Capacities API does not support reading object content.**

This MCP server can:
- **Search** for objects by title (returns IDs and titles only)
- **Create** new objects of any type
- **Write** to daily notes and save weblinks

This MCP server **cannot**:
- Read the actual content/body of any object
- Retrieve notes, documents, or page contents
- Export or analyze existing data

This is a limitation of the [Capacities API](https://docs.capacities.io/developer/api), not this server. The API is in beta and Capacities may add read endpoints in the future.

---

## What is this?

**CapacitiesMCP** is a [Model Context Protocol](https://modelcontextprotocol.io/) server that connects AI assistants to [Capacities.io](https://capacities.io) for searching and creating content.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Your AI Assistant                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CapacitiesMCP Server                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  REST API               │    X-Callback URLs            │   │
│  │  • Search by title      │    • Create objects           │   │
│  │  • List spaces          │    • Open in app              │   │
│  │  • Save weblinks        │    • Get current object info  │   │
│  │  • Add to daily note    │                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [!] NO READ ACCESS TO OBJECT CONTENT (API limitation)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Capacities.io                             │
└─────────────────────────────────────────────────────────────────┘
```

## What You Can Actually Do

| Feature | Works? | Details |
|---------|--------|---------|
| List your spaces | Yes | Get space IDs and titles |
| Search by title | Yes | Find objects, get IDs (not content) |
| Get object types | Yes | See available structures in a space |
| Create objects | Yes | Create Books, People, Meetings, custom types |
| Save weblinks | Yes | Clip URLs with tags and notes |
| Add to daily note | Yes | Append markdown to today's note |
| Open objects | Yes | Deep-link into the desktop app |
| **Read object content** | **NO** | **Not possible - API limitation** |
| **Export data** | **NO** | **Not possible - API limitation** |
| **Get page/note body** | **NO** | **Not possible - API limitation** |

## Installation

### Prerequisites

- Node.js 18+
- **Capacities.io Pro subscription** (required for API access)
- Capacities desktop app (required for creating objects)

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

> **Note:** API access requires a Capacities Pro subscription.

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

### Search & Discovery

#### `capacities_list_spaces`
List all spaces you have access to.

#### `capacities_search`
Search for objects by title. **Returns IDs and titles only, not content.**

```json
{
  "spaceId": "uuid-of-your-space",
  "searchTerm": "meeting notes"
}
```

#### `capacities_get_space_info`
Get info about a space including available structures.

#### `capacities_get_object_types`
List all object types (structures) available in a space.

### Create & Write

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
  "content": "## Meeting Summary\n- Discussed roadmap"
}
```

### Utility

#### `capacities_get_current_object`
Get info (URL, title) about the currently open object. **Does not return content.**

#### `capacities_open_object`
Open a specific object by its URL in the desktop app.

## Usage Examples

Things you **can** ask your AI assistant:

> "List all my Capacities spaces"

> "Search for 'project planning' in my work space"

> "Create a new Book called 'Deep Work' with notes about focus"

> "Save this URL to my research space"

> "Add a summary to today's daily note"

Things you **cannot** do:

> ~~"Read my meeting notes from last week"~~

> ~~"Summarize my research documents"~~

> ~~"Export all my notes about X topic"~~

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/spaces`, `/space-info` | 5 req/60s |
| `/lookup` | 120 req/60s |
| `/save-weblink` | 10 req/60s |
| `/save-to-daily-note` | 5 req/60s |

## Why No Read Access?

The Capacities API is in early beta. From their docs:

> "The Capacities API is in a very early stage. Many endpoints you'd expect for a REST API are not yet available."

There is no `/get-object` or similar endpoint. The x-callback URL scheme also only returns metadata (URL, title), not content.

**If you want this feature**, request it from Capacities directly.

## Development

```bash
npm run dev        # Watch mode
npm run typecheck  # Type checking
npm run build      # Build
```

## License

MIT

---

<p align="center">
  <sub>Built for the Capacities and MCP communities</sub><br>
  <sub>Waiting patiently for Capacities to add read endpoints...</sub>
</p>
