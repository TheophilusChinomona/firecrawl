/**
 * Job ID detection utility
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a string looks like a job ID (UUID format)
 */
export function isJobId(value: string): boolean {
  return UUID_REGEX.test(value);
}
