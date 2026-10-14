import { z } from 'zod';

export const RunPipelineSchema = z.object({
  pipelineId: z.string().min(1, 'Pipeline ID is required'),
  params: z.record(z.string(), z.any()).optional().default({}),
});
