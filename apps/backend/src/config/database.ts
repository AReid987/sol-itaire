import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

let supabase: SupabaseClient;

export async function connectDatabase(): Promise<SupabaseClient> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Test connection
    const { error } = await supabase.from('users').select('count').single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Database connection failed: ${error.message}`);
    }

    logger.info('Database connected successfully');
    return supabase;
  } catch (error) {
    logger.error('Database connection error:', error);
    throw error;
  }
}

export function getDatabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return supabase;
}

export { supabase };