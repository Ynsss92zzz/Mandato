import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

const SUPABASE_URL = 'https://qxvesmapqodrhdlrtdac.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dmVzbWFwcW9kcmhkbHJ0ZGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Nzk0MDcsImV4cCI6MjA5MzA1NTQwN30.3tC0ZHNNS-1HmqXo1Ho5oqUKfBEnwN0If2S3p6LNTKo'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // setAll peut échouer dans les Server Components (lecture seule)
        }
      },
    },
  })
}
