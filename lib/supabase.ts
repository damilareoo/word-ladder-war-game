import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Database types for better type safety
export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string
          nickname: string
          created_at: string
        }
        Insert: {
          id?: string
          nickname: string
          created_at?: string
        }
        Update: {
          id?: string
          nickname?: string
          created_at?: string
        }
      }
      game_scores: {
        Row: {
          id: string
          player_id: string
          nickname: string
          score: number
          word_count: number
          time_taken: number
          main_word: string
          level: number
          created_at: string
        }
        Insert: {
          id?: string
          player_id: string
          nickname: string
          score: number
          word_count: number
          time_taken: number
          main_word: string
          level: number
          created_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          nickname?: string
          score?: number
          word_count?: number
          time_taken?: number
          main_word?: string
          level?: number
          created_at?: string
        }
      }
    }
  }
}

// Enhanced configuration validation
const validateSupabaseConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL is missing")
  } else if (!supabaseUrl.includes("supabase.co") && !supabaseUrl.includes("localhost")) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL appears to be invalid")
  }

  if (!supabaseAnonKey) {
    errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing")
  } else if (supabaseAnonKey.length < 100) {
    errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be invalid")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Enhanced browser client with retry logic and error handling
const createBrowserClient = (): SupabaseClient<Database> => {
  const config = validateSupabaseConfig()

  if (!config.isValid) {
    console.error("Supabase configuration errors:", config.errors)
    throw new Error(`Supabase configuration invalid: ${config.errors.join(", ")}`)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // We don't need auth sessions for this game
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 20, // Increased for better real-time performance
      },
    },
    global: {
      fetch: async (url, options = {}) => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          })
          clearTimeout(timeoutId)

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          return response
        } catch (error) {
          clearTimeout(timeoutId)
          console.error("Supabase fetch error:", error)
          throw error
        }
      },
    },
  })
}

// Mock client for fallback scenarios
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
        }),
        eq: () => ({
          maybeSingle: () => Promise.resolve(mockResponse),
          single: () => Promise.resolve(mockResponse),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve(mockResponse),
          }),
        }),
      }),
      insert: () => ({
        select: () => Promise.resolve(mockResponse),
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
      send: () => Promise.resolve("ok"),
      unsubscribe: () => Promise.resolve("ok"),
    }),
    removeChannel: () => Promise.resolve(),
  } as any
}

// Singleton pattern with enhanced error handling
let browserClient: SupabaseClient<Database> | ReturnType<typeof createMockClient> | null = null
let clientInitializationError: Error | null = null

export const getSupabaseBrowserClient = (): SupabaseClient<Database> | ReturnType<typeof createMockClient> => {
  if (!browserClient && !clientInitializationError) {
    try {
      browserClient = createBrowserClient()
      console.log("✅ Supabase client initialized successfully")
    } catch (error) {
      clientInitializationError = error as Error
      console.error("❌ Failed to initialize Supabase client:", error)
      browserClient = createMockClient()
    }
  }

  return browserClient!
}

// Server-side client with enhanced configuration
export const createServerClient = () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing server-side Supabase configuration")
    }

    return createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  } catch (error) {
    console.error("Error creating Supabase server client:", error)
    return createMockClient()
  }
}

// Enhanced configuration check
export const isSupabaseConfigured = (): boolean => {
  const config = validateSupabaseConfig()
  return config.isValid && !clientInitializationError
}

// Get configuration status for debugging
export const getSupabaseStatus = () => {
  const config = validateSupabaseConfig()
  return {
    isConfigured: config.isValid,
    errors: config.errors,
    initializationError: clientInitializationError?.message,
    hasClient: !!browserClient,
  }
}

// Test connection utility
export const testSupabaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Supabase not configured" }
    }

    const client = getSupabaseBrowserClient()
    const { data, error } = await client.from("players").select("id").limit(1)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
