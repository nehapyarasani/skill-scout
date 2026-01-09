import { z } from 'zod';
import { resumeScreeningInput, jdAnalysisInput, resumeScreeningResponse, jdAnalysisResponse } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  analysis: {
    screenResume: {
      method: 'POST' as const,
      path: '/api/analyze/resume',
      // Input is FormData, handled separately in implementation
      responses: {
        200: resumeScreeningResponse,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
    analyzeJob: {
      method: 'POST' as const,
      path: '/api/analyze/job',
      input: jdAnalysisInput,
      responses: {
        200: jdAnalysisResponse,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
