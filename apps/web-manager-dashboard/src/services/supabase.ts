import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mcaufawwpycpcmuermds.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jYXVmYXd3cHljcGNtdWVybWRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwOTcxMDQsImV4cCI6MjA5MDY3MzEwNH0.edFoD61QcoLYHGToz5PKmVN3TB1MTztTsJJoECZ8Trg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
