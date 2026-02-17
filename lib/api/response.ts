import { NextResponse } from "next/server";

export interface ApiResponse<T = any> {
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: any;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export function success<T>(data: T, meta?: ApiResponse["meta"]) {
  return NextResponse.json({
    data,
    meta,
  } as ApiResponse<T>);
}

export function error(
  message: string,
  code: string = "ERROR",
  status: number = 400,
  details?: any
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    } as ApiResponse,
    { status }
  );
}

export function unauthorized(message: string = "Unauthorized") {
  return error(message, "UNAUTHORIZED", 401);
}

export function forbidden(message: string = "Forbidden") {
  return error(message, "FORBIDDEN", 403);
}

export function notFound(message: string = "Resource not found") {
  return error(message, "NOT_FOUND", 404);
}

export function badRequest(message: string, details?: any) {
  return error(message, "BAD_REQUEST", 400, details);
}

export function serverError(message: string = "Internal server error") {
  return error(message, "SERVER_ERROR", 500);
}
