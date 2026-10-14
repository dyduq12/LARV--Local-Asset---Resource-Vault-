import crypto from 'node:crypto';
import { assetRepository } from './asset.repository.js';
import { NotFoundError } from '../../core/errors/app-error.js';
import type {
  Asset,
  CreateAssetInput,
  UpdateAssetInput,
  AssetQueryParams,
  AssetListResponse,
} from '@larv/shared';

export class AssetService {
  public listAssets(params: AssetQueryParams): AssetListResponse {
    const { items, total } = assetRepository.findAll(params);
    return {
      items,
      total,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    };
  }

  public getAssetById(id: string): Asset {
    const asset = assetRepository.findById(id);
    if (!asset) {
      throw new NotFoundError(`Asset with ID '${id}' not found`);
    }
    return asset;
  }

  public createAsset(input: CreateAssetInput): Asset {
    const now = new Date().toISOString();
    const normalizedTags = Array.from(
      new Set(
        (input.tags || [])
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0)
      )
    );

    const asset: Asset = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      description: (input.description || '').trim(),
      category: input.category,
      language: input.language.trim().toLowerCase(),
      content: input.content,
      tags: normalizedTags,
      isPinned: Boolean(input.isPinned),
      createdAt: now,
      updatedAt: now,
    };

    return assetRepository.create(asset);
  }

  public updateAsset(id: string, input: UpdateAssetInput): Asset {
    this.getAssetById(id); // Throws NotFoundError if not found

    let normalizedTags = undefined;
    if (input.tags) {
      normalizedTags = Array.from(
        new Set(
          input.tags
            .map((t) => t.trim().toLowerCase())
            .filter((t) => t.length > 0)
        )
      );
    }

    const updates: Partial<Asset> = {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.language !== undefined ? { language: input.language.trim().toLowerCase() } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(normalizedTags !== undefined ? { tags: normalizedTags } : {}),
      ...(input.isPinned !== undefined ? { isPinned: Boolean(input.isPinned) } : {}),
    };

    const updated = assetRepository.update(id, updates);
    if (!updated) {
      throw new NotFoundError(`Asset with ID '${id}' not found`);
    }

    return updated;
  }

  public deleteAsset(id: string): { success: boolean; id: string } {
    this.getAssetById(id); // Throws NotFoundError if not found
    const deleted = assetRepository.delete(id);
    return { success: deleted, id };
  }
}

export const assetService = new AssetService();
