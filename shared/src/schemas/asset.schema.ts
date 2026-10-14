import { z } from 'zod';

export const AssetCategorySchema = z.enum(['snippet', 'config', 'doc', 'token']);

export const CreateAssetSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(120, 'Title cannot exceed 120 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .default(''),
  category: AssetCategorySchema,
  language: z
    .string()
    .min(1, 'Language is required')
    .max(50, 'Language name is too long')
    .trim()
    .toLowerCase(),
  content: z
    .string()
    .min(1, 'Content cannot be empty'),
  tags: z
    .array(z.string().min(1).max(30).trim().toLowerCase())
    .max(20, 'Maximum of 20 tags allowed')
    .default([]),
  isPinned: z.boolean().default(false),
});

export const UpdateAssetSchema = CreateAssetSchema.partial();

export const AssetQuerySchema = z.object({
  q: z.string().optional(),
  category: AssetCategorySchema.optional(),
  tag: z.string().optional(),
  isPinned: z
    .union([z.boolean(), z.string().transform((val) => val === 'true')])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
