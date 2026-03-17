import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    if (tableError.message.includes('relation "public.projects" does not exist')) {
      console.log('👉 ACTION: You need to run the schema.sql in the Supabase SQL Editor.');
    }
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
      console.log('👉 ACTION: Create a private bucket named "discovery-files" in Supabase Storage.');
    }
  }
}

checkSupabase();
