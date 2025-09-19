import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

export function createBrowserClient() {
  console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log(
    "KEY:",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Loaded" : "Missing"
  );
  console.log(process.env.NEXT_PUBLIC_SUPABASE_URL, "this is error");
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const createClient = createBrowserClient;

