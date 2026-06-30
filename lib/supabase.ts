import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fkplztvkrvpkfbqpccua.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGx6dHZrcnZwa2ZicXBjY3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2Njk2NzIsImV4cCI6MjA5ODI0NTY3Mn0.HvYRo2Ct1pOJX9RhXpAuHtLwyLpoBnMDopSw0ce4sa4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'provisions' },
})
