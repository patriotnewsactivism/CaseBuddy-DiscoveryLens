import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Manually parse .env.local since we can't use dotenv
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*([^#]+)\s*$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSupabase() {
  console.log('Checking Supabase connection...');
  
  // Check Tables
  const { data: tables, error: tableError } = await supabase
    .from('projects')
    .select('id')
    .limit(1);
    
  if (tableError) {
    console.error('❌ Projects table check failed:', tableError.message);
  } else {
    console.log('✅ Projects table is accessible.');
  }

  // Check Storage
  const { data: buckets, error: bucketError } = await supabase
    .storage
    .listBuckets();
    
  if (bucketError) {
    console.error('❌ Storage check failed:', bucketError.message);
  } else {
    const discoveryBucket = buckets?.find(b => b.name === 'discovery-files');
    if (discoveryBucket) {
      console.log('✅ "discovery-files" bucket exists.');
    } else {
      console.log('❌ "discovery-files" bucket NOT found.');
    }
  }
}

checkSupabase();
