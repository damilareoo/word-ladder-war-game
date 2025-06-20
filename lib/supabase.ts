import { createClient } from "@supabase/supabase-js"

// Create a single supabase client for the browser
const createBrowserClient = () => {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
      throw new Error(
        "Supabase URL not found. If you're setting up this project, make sure to add NEXT_PUBLIC_SUPABASE_URL to your .env.local file.",
      )
    }

    if (!supabaseAnonKey) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable")
      throw new Error(
        "Supabase Anon Key not found. If you're setting up this project, make sure to add NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.",
      )
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      // Add global error handler
      global: {
        fetch: (...args) => {
          return fetch(...args).catch((err) => {
            console.error("Supabase fetch error:", err)
            throw err
          })
        },
      },
    })
  } catch (error) {
    console.error("Error creating Supabase browser client:", error)
    // Return a mock client that will gracefully fail
    return createMockClient()
  }
}

// Create a mock client that will gracefully fail
const createMockClient = () => {
  const mockResponse = {
    data: null,
    error: new Error("Supabase client unavailable. Please check your environment variables and Supabase setup."),
  }

  return {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve(mockResponse),
          maybeSingle: () => Promise.resolve(mockResponse),
          single: () => Promise.resolve(mockResponse),
          abortSignal: () => Promise.resolve(mockResponse),
        }),
        eq: () => ({
          maybeSingle: () => Promise.resolve(mockResponse),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve(mockResponse),
          }),
        }),
      }),
      insert: () => ({
        select: () => Promise.resolve(mockResponse),
        upsert: () => ({
          select: () => Promise.resolve(mockResponse),
        }),
      }),
      upsert: () => ({
        select: () => Promise.resolve(mockResponse),
      }),
    }),
    channel: () => ({
      on: () => ({
        subscribe: () => Promise.resolve({ state: "subscribed" }),
      }),
      subscribe: () => Promise.resolve({ state: "subscribed" }),
    }),
    removeChannel: () => Promise.resolve(),
  }
}

// Singleton pattern to avoid multiple instances
let browserClient: ReturnType<typeof createClient> | ReturnType<typeof createMockClient> | null = null

export const getSupabaseBrowserClient = () => {
  if (!browserClient) {
    try {
      browserClient = createBrowserClient()
    } catch (error) {
      console.error("Error initializing Supabase browser client:", error)
      browserClient = createMockClient()
    }
  }
  return browserClient
}

// Server-side client (for server components and API routes)
export const createServerClient = () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      console.error("Missing SUPABASE_URL environment variable")
      throw new Error(
        "Supabase URL not found. If you're setting up this project, make sure to add SUPABASE_URL to your .env.local file.",
      )
    }

    if (!supabaseServiceKey) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable")
      throw new Error(
        "Supabase Service Role Key not found. If you're setting up this project, make sure to add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.",
      )
    }

    return createClient(supabaseUrl, supabaseServiceKey)
  } catch (error) {
    console.error("Error creating Supabase server client:", error)
    return createMockClient()
  }
}
