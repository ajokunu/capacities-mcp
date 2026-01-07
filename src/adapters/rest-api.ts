/**
 * REST API Adapter for Capacities.io
 * Handles all REST API operations: search, lookup, space info, weblinks, daily notes
 */

const API_BASE = 'https://api.capacities.io';

// Rate limit tracking
interface RateLimitInfo {
  remaining: number;
  resetAt: number;
}

const rateLimits: Map<string, RateLimitInfo> = new Map();

export interface Space {
  id: string;
  title: string;
  icon?: string;
}

export interface Structure {
  id: string;
  title: string;
  pluralName: string;
  propertyDefinitions?: PropertyDefinition[];
}

export interface PropertyDefinition {
  id: string;
  name: string;
  type: string;
}

export interface SpaceInfo {
  id: string;
  title: string;
  structures: Structure[];
  collections: Collection[];
}

export interface Collection {
  id: string;
  title: string;
  structureId: string;
}

export interface LookupResult {
  id: string;
  structureId: string;
  title: string;
  structureTitle?: string;
}

export interface SaveWeblinkParams {
  spaceId: string;
  url: string;
  title?: string;
  description?: string;
  tags?: string[];
  mdText?: string;
}

export interface SaveToDailyNoteParams {
  spaceId: string;
  mdText: string;
  origin?: string;
  noTimestamp?: boolean;
}

export class CapacitiesRestApi {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;

    // Normalize endpoint for rate limiting (strip query params)
    const rateLimitKey = endpoint.split('?')[0];

    // Check rate limits
    const limitInfo = rateLimits.get(rateLimitKey);
    if (limitInfo && limitInfo.remaining <= 0 && Date.now() < limitInfo.resetAt) {
      const waitTime = limitInfo.resetAt - Date.now();
      throw new Error(`Rate limited. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Update rate limit tracking from headers
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');
    if (remaining !== null && reset !== null) {
      rateLimits.set(rateLimitKey, {
        remaining: parseInt(remaining, 10),
        resetAt: parseInt(reset, 10) * 1000,
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * List all spaces the user has access to
   * Rate limit: 5 requests per 60 seconds
   */
  async listSpaces(): Promise<{ spaces: Space[] }> {
    return this.request<{ spaces: Space[] }>('/spaces', { method: 'GET' });
  }

  /**
   * Get detailed information about a space including structures and collections
   * Rate limit: 5 requests per 60 seconds
   */
  async getSpaceInfo(spaceId: string): Promise<SpaceInfo> {
    return this.request<SpaceInfo>(`/space-info?spaceId=${encodeURIComponent(spaceId)}`, {
      method: 'GET',
    });
  }

  /**
   * Search/lookup objects by title in a space
   * Rate limit: 120 requests per 60 seconds
   * Note: Uses the new /lookup endpoint (old /search is deprecated Jan 12, 2026)
   */
  async lookup(spaceId: string, searchTerm: string): Promise<{ results: LookupResult[] }> {
    return this.request<{ results: LookupResult[] }>('/lookup', {
      method: 'POST',
      body: JSON.stringify({
        spaceId,
        searchTerm,
      }),
    });
  }

  /**
   * Save a weblink to a space
   * Rate limit: 10 requests per 60 seconds
   */
  async saveWeblink(params: SaveWeblinkParams): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/save-weblink', {
      method: 'POST',
      body: JSON.stringify({
        spaceId: params.spaceId,
        url: params.url,
        title: params.title,
        description: params.description,
        tags: params.tags,
        mdText: params.mdText,
      }),
    });
  }

  /**
   * Add content to today's daily note
   * Rate limit: 5 requests per 60 seconds
   */
  async saveToDailyNote(params: SaveToDailyNoteParams): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/save-to-daily-note', {
      method: 'POST',
      body: JSON.stringify({
        spaceId: params.spaceId,
        mdText: params.mdText,
        origin: params.origin || 'capacities-mcp',
        noTimestamp: params.noTimestamp ?? false,
      }),
    });
  }

  /**
   * Get available object types for a space
   */
  async getObjectTypes(spaceId: string): Promise<Structure[]> {
    const spaceInfo = await this.getSpaceInfo(spaceId);
    return spaceInfo.structures;
  }
}
