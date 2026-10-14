import type { FastifyReply, FastifyRequest } from 'fastify';
import { assetService } from './asset.service.js';
import {
  CreateAssetSchema,
  UpdateAssetSchema,
  AssetQuerySchema,
} from '@larv/shared';
import { ValidationError } from '../../core/errors/app-error.js';

export class AssetController {
  public async list(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = AssetQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      throw new ValidationError('Invalid query parameters', parseResult.error.format());
    }

    const result = assetService.listAssets(parseResult.data as any);
    return reply.status(200).send(result);
  }

  public async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const asset = assetService.getAssetById(id);
    return reply.status(200).send(asset);
  }

  public async create(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = CreateAssetSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError('Validation error on asset creation', parseResult.error.format());
    }

    const created = assetService.createAsset(parseResult.data as any);
    return reply.status(201).send(created);
  }

  public async update(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const parseResult = UpdateAssetSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new ValidationError('Validation error on asset update', parseResult.error.format());
    }

    const updated = assetService.updateAsset(id, parseResult.data as any);
    return reply.status(200).send(updated);
  }

  public async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const result = assetService.deleteAsset(id);
    return reply.status(200).send(result);
  }
}

export const assetController = new AssetController();
