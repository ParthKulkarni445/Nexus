import { z } from "zod";
import { badRequest } from "./response";

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T | Response> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return badRequest("Validation failed", result.error.issues);
    }

    return result.data;
  } catch (error) {
    return badRequest("Invalid JSON body");
  }
}

/**
 * Parse and validate query parameters
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): T | Response {
  const params = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(params);

  if (!result.success) {
    return badRequest("Invalid query parameters", result.error.issues);
  }

  return result.data;
}

/**
 * Common query parameter schemas
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const searchSchema = z.object({
  search: z.string().optional(),
});

export const idSchema = z.object({
  id: z.string().uuid(),
});
