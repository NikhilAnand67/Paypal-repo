import "server-only";

export type AuthProviderAvailability = {
  google: boolean | null;
  github: boolean | null;
  email: boolean | null;
};

const unknown: AuthProviderAvailability = { google: null, github: null, email: null };

export async function getAuthProviders(): Promise<AuthProviderAvailability> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return unknown;

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(1500),
      next: { revalidate: 60 },
    });

    if (!response.ok) return unknown;

    const settings = (await response.json()) as {
      external?: Record<string, boolean | undefined>;
    };

    return {
      google: settings.external?.google ?? null,
      github: settings.external?.github ?? null,
      email: settings.external?.email ?? null,
    };
  } catch {
    return unknown;
  }
}
