import type {
  Asset,
  AssetListResponse,
  AssetQueryParams,
  CreateAssetInput,
  PipelineExecutionResult,
  PipelineTask,
  SystemTelemetry,
  UpdateAssetInput,
} from '@larv/shared';

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface PipelineRunResponse {
  pipelineId: string;
  executionId: string;
  status: string;
  message: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: number;
}

class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl = 'http://127.0.0.1:3001/api/v1') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = new Headers(options.headers);

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorData: ApiErrorResponse | null = null;
        try {
          errorData = (await response.json()) as ApiErrorResponse;
        } catch {
          errorData = null;
        }

        const message = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        const code = errorData?.error?.code || 'HTTP_ERROR';
        const details = errorData?.error?.details;

        throw new ApiClientError(message, response.status, code, details);
      }

      return (await response.json()) as T;
    } catch (error: unknown) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      const networkMessage = error instanceof Error ? error.message : 'Network connection failure';
      throw new ApiClientError(networkMessage, 0, 'NETWORK_ERROR');
    }
  }

  // Health
  public async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  // Telemetry
  public async getTelemetrySnapshot(): Promise<SystemTelemetry> {
    return this.request<SystemTelemetry>('/telemetry/snapshot');
  }

  // Assets
  public async listAssets(params: AssetQueryParams = {}): Promise<AssetListResponse> {
    const searchParams = new URLSearchParams();

    if (params.q) searchParams.set('q', params.q);
    if (params.category) searchParams.set('category', params.category);
    if (params.tag) searchParams.set('tag', params.tag);
    if (params.isPinned !== undefined) searchParams.set('isPinned', String(params.isPinned));
    if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params.offset !== undefined) searchParams.set('offset', String(params.offset));

    const queryString = searchParams.toString();
    const endpoint = `/assets${queryString ? `?${queryString}` : ''}`;
    return this.request<AssetListResponse>(endpoint);
  }

  public async getAssetById(id: string): Promise<Asset> {
    return this.request<Asset>(`/assets/${encodeURIComponent(id)}`);
  }

  public async createAsset(payload: CreateAssetInput): Promise<Asset> {
    return this.request<Asset>('/assets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateAsset(id: string, payload: UpdateAssetInput): Promise<Asset> {
    return this.request<Asset>(`/assets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  public async deleteAsset(id: string): Promise<{ success: boolean; id: string }> {
    return this.request<{ success: boolean; id: string }>(`/assets/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  // Pipelines
  public async listPipelines(): Promise<PipelineTask[]> {
    return this.request<PipelineTask[]>('/pipelines');
  }

  public async runPipeline(
    pipelineId: string,
    params: Record<string, unknown> = {}
  ): Promise<PipelineRunResponse> {
    return this.request<PipelineRunResponse>(`/pipelines/${encodeURIComponent(pipelineId)}/run`, {
      method: 'POST',
      body: JSON.stringify({ params }),
    });
  }
}

export const apiClient = new ApiClient();
