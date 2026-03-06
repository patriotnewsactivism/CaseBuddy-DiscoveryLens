const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length === 0) {
  console.log('Supabase env vars present');
  process.exit(0);
}

console.log(`Missing ${missing.join(' or ')}`);
process.exit(2);
