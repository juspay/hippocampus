import {
  Engram,
  EngramCreateInput,
  EngramUpdateInput,
  SearchQuery,
  SearchResult,
  Chronicle,
  ChronicleCreateInput,
  ChronicleUpdateInput,
  ChronicleQuery,
  Nexus,
  NexusCreateInput,
  HealthResponse,
  StatusResponse,
  HippocampusOptions,
  Strand,
} from './types';
import { HippocampusError } from './errors';
import { logger } from './logger';

export class Hippocampus {
  private baseUrl: string;
  private headers: Record<string, string>;
  private retries: number;
  private retryDelay: number;

  constructor(options: HippocampusOptions = {}) {
    const baseUrl = options.baseUrl || process.env.HC_BASE_URL || 'http://localhost:4477';
    const apiKey = options.apiKey || process.env.HC_API_KEY;

    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.headers = {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      ...options.headers,
    };
    this.retries = options.retries ?? 3;
    this.retryDelay = options.retryDelay ?? 1000;

    logger.debug('Hippocampus client initialized', {
      baseUrl: this.baseUrl,
      retries: this.retries,
      retryDelay: this.retryDelay,
      hasApiKey: !!apiKey,
    });
  }

  // --- Engrams ---

  async addMemory(input: EngramCreateInput): Promise<{ engrams: Engram[] }> {
    logger.info('Adding memory', { ownerId: input.ownerId, strand: input.strand });
    const result = await this.post<{ engrams: Engram[] }>('/api/engrams', input);
    logger.info('Memory added', { count: result.engrams.length });
    return result;
  }

  async listEngrams(
    ownerId: string,
    options?: { limit?: number; offset?: number; strand?: Strand }
  ): Promise<{ engrams: Engram[]; total: number }> {
    logger.debug('Listing engrams', { ownerId, ...options });
    const params = new URLSearchParams({ ownerId });
    if (options?.limit) {
      params.set('limit', String(options.limit));
    }
    if (options?.offset) {
      params.set('offset', String(options.offset));
    }
    if (options?.strand) {
      params.set('strand', options.strand);
    }
    const result = await this.get<{ engrams: Engram[]; total: number }>(`/api/engrams?${params}`);
    logger.debug('Engrams listed', { total: result.total });
    return result;
  }

  async getEngram(id: string): Promise<{ engram: Engram }> {
    logger.debug('Getting engram', { id });
    return this.get(`/api/engrams/${id}`);
  }

  async updateEngram(id: string, input: EngramUpdateInput): Promise<{ engram: Engram }> {
    logger.info('Updating engram', { id });
    const result = await this.patch<{ engram: Engram }>(`/api/engrams/${id}`, input);
    logger.info('Engram updated', { id });
    return result;
  }

  async deleteEngram(id: string): Promise<void> {
    logger.info('Deleting engram', { id });
    await this.del(`/api/engrams/${id}`);
    logger.info('Engram deleted', { id });
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    logger.info('Searching engrams', { ownerId: query.ownerId, query: query.query, limit: query.limit });
    const result = await this.post<SearchResult>('/api/engrams/search', query);
    logger.info('Search completed', { hits: result.hits.length, total: result.total, took: result.took });
    return result;
  }

  async reinforceEngram(id: string, boost?: number): Promise<{ engram: Engram }> {
    logger.debug('Reinforcing engram', { id, boost });
    const result = await this.post<{ engram: Engram }>(`/api/engrams/${id}/reinforce`, { boost });
    logger.debug('Engram reinforced', { id, signal: result.engram.signal });
    return result;
  }

  // --- Chronicles ---

  async recordChronicle(input: ChronicleCreateInput): Promise<{ chronicle: Chronicle }> {
    logger.info('Recording chronicle', { ownerId: input.ownerId, entity: input.entity, attribute: input.attribute });
    const result = await this.post<{ chronicle: Chronicle }>('/api/chronicles', input);
    logger.info('Chronicle recorded', { id: result.chronicle.id });
    return result;
  }

  async queryChronicles(query: ChronicleQuery): Promise<{ chronicles: Chronicle[]; total: number }> {
    logger.debug('Querying chronicles', { ownerId: query.ownerId, entity: query.entity, attribute: query.attribute });
    const params = new URLSearchParams({ ownerId: query.ownerId });
    if (query.entity) {
      params.set('entity', query.entity);
    }
    if (query.attribute) {
      params.set('attribute', query.attribute);
    }
    if (query.at) {
      params.set('at', query.at);
    }
    if (query.from) {
      params.set('from', query.from);
    }
    if (query.to) {
      params.set('to', query.to);
    }
    if (query.limit) {
      params.set('limit', String(query.limit));
    }
    if (query.offset) {
      params.set('offset', String(query.offset));
    }
    const result = await this.get<{ chronicles: Chronicle[]; total: number }>(`/api/chronicles?${params}`);
    logger.debug('Chronicles queried', { total: result.total });
    return result;
  }

  async getCurrentFact(ownerId: string, entity: string, attribute: string): Promise<{ chronicle: Chronicle }> {
    logger.debug('Getting current fact', { ownerId, entity, attribute });
    const params = new URLSearchParams({ ownerId, entity, attribute });
    return this.get(`/api/chronicles/current?${params}`);
  }

  async getTimeline(ownerId: string, entity: string): Promise<{ chronicles: Chronicle[] }> {
    logger.debug('Getting timeline', { ownerId, entity });
    const params = new URLSearchParams({ ownerId, entity });
    const result = await this.get<{ chronicles: Chronicle[] }>(`/api/chronicles/timeline?${params}`);
    logger.debug('Timeline retrieved', { count: result.chronicles.length });
    return result;
  }

  async getChronicle(id: string): Promise<{ chronicle: Chronicle }> {
    logger.debug('Getting chronicle', { id });
    return this.get(`/api/chronicles/${id}`);
  }

  async updateChronicle(id: string, input: ChronicleUpdateInput): Promise<{ chronicle: Chronicle }> {
    logger.info('Updating chronicle', { id });
    const result = await this.patch<{ chronicle: Chronicle }>(`/api/chronicles/${id}`, input);
    logger.info('Chronicle updated', { id });
    return result;
  }

  async expireChronicle(id: string): Promise<void> {
    logger.info('Expiring chronicle', { id });
    await this.del(`/api/chronicles/${id}`);
    logger.info('Chronicle expired', { id });
  }

  // --- Nexuses ---

  async createNexus(input: NexusCreateInput): Promise<{ nexus: Nexus }> {
    logger.info('Creating nexus', { originId: input.originId, linkedId: input.linkedId, bondType: input.bondType });
    const result = await this.post<{ nexus: Nexus }>('/api/nexuses', input);
    logger.info('Nexus created', { id: result.nexus.id });
    return result;
  }

  async getRelatedChronicles(chronicleId: string): Promise<{ related: { nexus: Nexus; chronicle: Chronicle }[] }> {
    logger.debug('Getting related chronicles', { chronicleId });
    const result = await this.get<{ related: { nexus: Nexus; chronicle: Chronicle }[] }>(
      `/api/chronicles/${chronicleId}/related`
    );
    logger.debug('Related chronicles retrieved', { count: result.related.length });
    return result;
  }

  // --- System ---

  async health(): Promise<HealthResponse> {
    logger.debug('Health check');
    return this.get('/api/health');
  }

  async status(): Promise<StatusResponse> {
    logger.debug('Status check');
    return this.get('/api/status');
  }

  async runDecay(ownerId: string): Promise<{ affected: number }> {
    logger.info('Running decay', { ownerId });
    const result = await this.post<{ affected: number }>('/api/decay/run', { ownerId });
    logger.info('Decay completed', { affected: result.affected });
    return result;
  }

  // --- HTTP helpers ---

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        if (attempt > 0) {
          logger.warn('Retrying request', { method, path, attempt, maxRetries: this.retries });
        }

        logger.debug('Sending request', { method, url });

        const response = await fetch(url, {
          method,
          headers: this.headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        if (response.status === 204) {
          logger.debug('Request successful (204 No Content)', { method, path });
          return undefined as T;
        }

        const json = await response.json();

        if (!response.ok) {
          const error = HippocampusError.fromResponse(response.status, json);
          logger.error('Request failed with HTTP error', {
            method,
            path,
            statusCode: response.status,
            message: error.message,
          });
          throw error;
        }

        logger.debug('Request successful', { method, path, status: response.status });
        return json as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry client errors (4xx)
        if (error instanceof HippocampusError && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }

        if (attempt < this.retries) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          logger.warn('Request failed, will retry', {
            method,
            path,
            attempt,
            nextRetryIn: `${delay}ms`,
            error: lastError.message,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          logger.error('Request failed after all retries', {
            method,
            path,
            attempts: attempt + 1,
            error: lastError.message,
          });
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  private get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  private post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  private del<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}
