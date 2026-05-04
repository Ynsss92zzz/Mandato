import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const SUPABASE_URL = 'https://qxvesmapqodrhdlrtdac.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dmVzbWFwcW9kcmhkbHJ0ZGFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ3OTQwNywiZXhwIjoyMDkzMDU1NDA3fQ.6CI6rr4Y2hoKQTaB14q7wN88lApzmjbV6v34FshRiGw'

// Client admin avec service role — server-side uniquement, jamais exposé au client
export function createAdminClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
