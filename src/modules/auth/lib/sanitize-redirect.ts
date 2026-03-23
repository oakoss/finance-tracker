export function sanitizeRedirect(
  redirect?: string,
  fallback = '/dashboard',
): string {
  if (
    !redirect ||
    !redirect.startsWith('/') ||
    redirect.startsWith('//') ||
    redirect.startsWith('/\\')
  ) {
    return fallback;
  }
  return redirect;
}
