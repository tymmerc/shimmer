/** Adresse publique de l'API (liens envoyés par e-mail). nginx la publie sous /shimmer. */
export function publicApiBase(): string {
  return (process.env.PUBLIC_API_BASE ?? 'https://tymmerc.eu/shimmer').replace(/\/$/, '');
}
