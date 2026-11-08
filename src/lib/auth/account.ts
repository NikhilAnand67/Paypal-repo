import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export function displayName(user: User | null, profile?: Profile | null) {
  if (profile?.full_name) return profile.full_name;
  const metadataName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    (user?.user_metadata?.user_name as string | undefined);
  if (metadataName) return metadataName;
  return user?.email?.split("@")[0] ?? "Pilot";
}

export function avatarUrl(user: User | null, profile?: Profile | null) {
  return (
    profile?.avatar_url ??
    (user?.user_metadata?.avatar_url as string | undefined) ??
    (user?.user_metadata?.picture as string | undefined) ??
    null
  );
}

export function authProvider(user: User | null, profile?: Profile | null) {
  const provider =
    profile?.auth_provider ??
    (user?.app_metadata?.provider as string | undefined) ??
    (user?.identities?.[0]?.provider as string | undefined) ??
    "email";
  return provider;
}

function profileSeed(user: User) {
  return {
    id: user.id,
    email: user.email ?? "",
    full_name: displayName(user),
    avatar_url: avatarUrl(user),
    auth_provider: authProvider(user),
    provider_user_id:
      (user.user_metadata?.sub as string | undefined) ?? user.identities?.[0]?.id ?? null,
  };
}

/**
 * Returns the authenticated user, profile, and a request scoped Supabase client.
 * A missing profile table is surfaced as an error instead of silently failing.
 */
export const getAccount = cache(async () => {
  const supabase = await createClient();

  let user: User | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  if (!user) {
    return { supabase, user: null, profile: null, error: null as string | null };
  }

  const { data: existing, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      supabase,
      user,
      profile: null,
      error: error.code === "PGRST205" ? "database_not_initialized" : "profile_unavailable",
    };
  }

  if (existing) {
    return { supabase, user, profile: existing as Profile, error: null };
  }

  const { data: created } = await supabase
    .from("profiles")
    .insert(profileSeed(user))
    .select("*")
    .maybeSingle();

  return {
    supabase,
    user,
    profile: (created as Profile | null) ?? null,
    error: created ? null : "profile_unavailable",
  };
});

export async function requireUser() {
  const account = await getAccount();
  if (!account.user) {
    redirect("/login");
  }
  return account;
}

export function sanitizeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (value.startsWith("/login") || value.startsWith("/auth")) return fallback;
  return value;
}
