// backend/config/supabase.js
const { createClient } = require('@supabase/supabase-js');

// Supabase client initialization using the Service Role Key for server security
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY 
);

module.exports = { supabase };