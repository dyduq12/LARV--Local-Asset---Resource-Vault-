export type AssetCategory = 'snippet' | 'config' | 'doc' | 'token';

export interface Asset {
  id: string;
  title: string;
  description: string;
  category: AssetCategory;
  language: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateAssetInput = Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateAssetInput = Partial<CreateAssetInput>;

export interface AssetQueryParams {
  q?: string;
  category?: AssetCategory;
  tag?: string;
  isPinned?: boolean;
  limit?: number;
  offset?: number;
}

export interface AssetListResponse {
  items: Asset[];
  total: number;
  limit: number;
  offset: number;
}
