'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

const SUPABASE_URL = 'https://qxvesmapqodrhdlrtdac.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dmVzbWFwcW9kcmhkbHJ0ZGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Nzk0MDcsImV4cCI6MjA5MzA1NTQwN30.3tC0ZHNNS-1HmqXo1Ho5oqUKfBEnwN0If2S3p6LNTKo'

export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
}
