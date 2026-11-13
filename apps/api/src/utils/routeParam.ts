import { ApiError } from './ApiError';

export function getRouteParam(value: string | string[]): string {
  const param = Array.isArray(value) ? value[0] : value;
  if (!param) throw new ApiError(400, 'A required route parameter is missing.');
  return param;
}
