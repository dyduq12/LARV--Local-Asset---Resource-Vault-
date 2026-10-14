import { initializeDatabase } from '../../config/database.js';
import type { Asset, AssetQueryParams } from '@larv/shared';

interface AssetRow {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  content: string;
  tags: string;
  is_pinned: number;
  created_at: string;
  updated_at: string;
}

function mapRowToAsset(row: AssetRow): Asset {
  let parsedTags: string[] = [];
  try {
    parsedTags = JSON.parse(row.tags);
  } catch {
    parsedTags = [];
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    category: row.category as any,
    language: row.language,
    content: row.content,
    tags: parsedTags,
    isPinned: Boolean(row.is_pinned),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AssetRepository {
  private get db() {
    return initializeDatabase();
  }

  public findAll(params: AssetQueryParams): { items: Asset[]; total: number } {
    const conditions: string[] = [];
    const bindings: unknown[] = [];

    if (params.category) {
      conditions.push('category = ?');
      bindings.push(params.category);
    }

    if (params.isPinned !== undefined) {
      conditions.push('is_pinned = ?');
      bindings.push(params.isPinned ? 1 : 0);
    }

    if (params.tag) {
      conditions.push('tags LIKE ?');
      bindings.push(`%"${params.tag.toLowerCase()}"%`);
    }

    if (params.q) {
      conditions.push('(title LIKE ? OR description LIKE ? OR content LIKE ?)');
      const term = `%${params.q}%`;
      bindings.push(term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countSql = `SELECT COUNT(*) as count FROM assets ${whereClause}`;
    const countRow = this.db.prepare(countSql).get(...bindings) as { count: number } | undefined;
    const total = countRow?.count ?? 0;

    // Items query with sorting (pinned first, then newest)
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
    const offset = Math.max(params.offset ?? 0, 0);

    const itemsSql = `
      SELECT * FROM assets
      ${whereClause}
      ORDER BY is_pinned DESC, created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = this.db.prepare(itemsSql).all(...bindings, limit, offset) as AssetRow[];
    const items = rows.map(mapRowToAsset);

    return { items, total };
  }

  public findById(id: string): Asset | null {
    const sql = `SELECT * FROM assets WHERE id = ? LIMIT 1`;
    const row = this.db.prepare(sql).get(id) as AssetRow | undefined;
    return row ? mapRowToAsset(row) : null;
  }

  public create(asset: Asset): Asset {
    const sql = `
      INSERT INTO assets (id, title, description, category, language, content, tags, is_pinned, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    this.db.prepare(sql).run(
      asset.id,
      asset.title,
      asset.description,
      asset.category,
      asset.language,
      asset.content,
      JSON.stringify(asset.tags),
      asset.isPinned ? 1 : 0,
      asset.createdAt,
      asset.updatedAt
    );

    return asset;
  }

  public update(id: string, updates: Partial<Asset>): Asset | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    const updated: Asset = {
      ...existing,
      ...updates,
      tags: updates.tags ?? existing.tags,
      updatedAt: new Date().toISOString(),
    };

    const sql = `
      UPDATE assets
      SET title = ?, description = ?, category = ?, language = ?, content = ?, tags = ?, is_pinned = ?, updated_at = ?
      WHERE id = ?
    `;

    this.db.prepare(sql).run(
      updated.title,
      updated.description,
      updated.category,
      updated.language,
      updated.content,
      JSON.stringify(updated.tags),
      updated.isPinned ? 1 : 0,
      updated.updatedAt,
      id
    );

    return updated;
  }

  public delete(id: string): boolean {
    const sql = `DELETE FROM assets WHERE id = ?`;
    const result = this.db.prepare(sql).run(id);
    return Number(result.changes) > 0;
  }
}

export const assetRepository = new AssetRepository();
