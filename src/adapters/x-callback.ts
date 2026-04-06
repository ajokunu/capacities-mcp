/**
 * X-Callback URL Adapter for Capacities.io
 * Handles object creation and other x-callback-url operations
 * Requires Capacities desktop app to be running
 */

import { spawn } from 'child_process';
import { createServer, IncomingMessage, ServerResponse, Server } from 'http';
import { platform } from 'os';

export interface CreateObjectParams {
  spaceId?: string;
  type?: string;
  title?: string;
  content?: string;
  tags?: string[];
}

export interface AppendToDailyNoteParams {
  spaceId?: string;
  content: string;
}

export interface XCallbackResponse {
  success: boolean;
  url?: string;
  title?: string;
  name?: string;
  error?: string;
}

/**
 * Build content string with optional tags prepended as markdown
 */
function buildContentWithTags(content?: string, tags?: string[]): string | undefined {
  if (!tags?.length && !content) return undefined;

  const tagLine = tags?.length ? tags.map(t => `#${t}`).join(' ') : '';

  if (tagLine && content) {
    return `${tagLine}\n\n${content}`;
  }
  return tagLine || content;
}

/**
 * Build x-callback URL with proper encoding
 */
function buildXCallbackUrl(
  action: string,
  params: Record<string, string | undefined>
): string {
  const baseUrl = `capacities://x-callback-url/${action}`;
  const queryParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value);
    }
  }

  const queryString = queryParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Execute URL open command safely (cross-platform)
 * Uses spawn instead of exec to prevent command injection
 */
async function openUrl(url: string): Promise<void> {
  const os = platform();

  return new Promise((resolve, reject) => {
    let proc: ReturnType<typeof spawn>;

    if (os === 'darwin') {
      // macOS - use 'open' command
      proc = spawn('open', [url], { stdio: 'ignore' });
    } else if (os === 'win32') {
      // Windows - use PowerShell to handle URLs with query parameters correctly
      // cmd.exe mishandles special characters like ? and & in URLs
      proc = spawn('powershell', ['-Command', `Start-Process '${url}'`], { stdio: 'ignore' });
    } else {
      // Linux - use xdg-open
      proc = spawn('xdg-open', [url], { stdio: 'ignore' });
    }

    proc.on('error', (err) => {
      reject(new Error(`Failed to open URL: ${err.message}. Is Capacities desktop app installed?`));
    });

    proc.on('close', (code) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`Failed to open Capacities URL. Exit code: ${code}. Is Capacities desktop app running?`));
      }
    });
  });
}

/**
 * Get the assigned port from a listening server
 */
function getServerPort(server: Server): number {
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Server not listening or has invalid address');
  }
  return address.port;
}

export class CapacitiesXCallback {
  private callbackPort: number;
  private callbackTimeout: number;

  constructor(options?: { callbackPort?: number; callbackTimeout?: number }) {
    this.callbackPort = options?.callbackPort ?? 0; // 0 = auto-assign
    this.callbackTimeout = options?.callbackTimeout ?? 30000; // 30 seconds
  }

  /**
   * Create a new object in Capacities
   * Uses x-callback-url createNewObject action
   * Fire-and-forget mode (no callback response)
   */
  async createObject(params: CreateObjectParams): Promise<XCallbackResponse> {
    const content = buildContentWithTags(params.content, params.tags);

    const url = buildXCallbackUrl('createNewObject', {
      spaceId: params.spaceId,
      type: params.type,
      title: params.title,
      content: content,
    });

    try {
      await openUrl(url);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create object with callback handling (advanced mode)
   * Starts a temporary HTTP server to receive the callback response
   */
  async createObjectWithCallback(params: CreateObjectParams): Promise<XCallbackResponse> {
    return this.executeWithCallback((callbackBase) => {
      const content = buildContentWithTags(params.content, params.tags);
      return buildXCallbackUrl('createNewObject', {
        spaceId: params.spaceId,
        type: params.type,
        title: params.title,
        content: content,
        'x-success': `${callbackBase}/success`,
        'x-error': `${callbackBase}/error`,
      });
    });
  }

  /**
   * Append content to today's daily note
   * Uses x-callback-url appendToDailyNote action
   */
  async appendToDailyNote(params: AppendToDailyNoteParams): Promise<XCallbackResponse> {
    const url = buildXCallbackUrl('appendToDailyNote', {
      spaceId: params.spaceId,
      content: params.content,
    });

    try {
      await openUrl(url);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get the currently open object in Capacities
   * Uses x-callback-url getCurrentObject action
   * Requires callback handling to get the response
   */
  async getCurrentObject(): Promise<XCallbackResponse> {
    return this.executeWithCallback((callbackBase) => {
      return buildXCallbackUrl('getCurrentObject', {
        'x-success': `${callbackBase}/success`,
        'x-error': `${callbackBase}/error`,
      });
    });
  }

  /**
   * Open a specific object in Capacities by URL
   */
  async openObject(objectUrl: string): Promise<XCallbackResponse> {
    try {
      await openUrl(objectUrl);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Helper method to execute x-callback operations that need callback responses
   */
  private async executeWithCallback(
    buildUrl: (callbackBase: string) => string
  ): Promise<XCallbackResponse> {
    return new Promise((resolve, reject) => {
      let resolved = false;
      let server: Server | null = null;
      let timeoutId: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (server) {
          server.close();
          server = null;
        }
      };

      const finish = (response: XCallbackResponse) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(response);
      };

      server = createServer((req: IncomingMessage, res: ServerResponse) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');

        if (!req.url) return;

        try {
          const reqUrl = new URL(req.url, 'http://localhost');

          if (reqUrl.pathname === '/success') {
            finish({
              success: true,
              url: reqUrl.searchParams.get('url') ?? undefined,
              title: reqUrl.searchParams.get('title') ?? undefined,
              name: reqUrl.searchParams.get('name') ?? undefined,
            });
          } else if (reqUrl.pathname === '/error') {
            finish({
              success: false,
              error: reqUrl.searchParams.get('errorMessage') ?? 'Unknown error',
            });
          }
        } catch {
          // Ignore URL parsing errors
        }
      });

      server.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(new Error(`Callback server error: ${err.message}`));
        }
      });

      server.listen(this.callbackPort, '127.0.0.1', async () => {
        try {
          const port = getServerPort(server!);
          const callbackBase = `http://127.0.0.1:${port}`;
          const url = buildUrl(callbackBase);
          await openUrl(url);
        } catch (error) {
          finish({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      timeoutId = setTimeout(() => {
        finish({
          success: false,
          error: 'Timeout waiting for Capacities response. Is the desktop app running?',
        });
      }, this.callbackTimeout);
    });
  }
}
