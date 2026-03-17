async function applySupabaseCors() {
  const projectRef = 'czrqlvvjrwizwdyefldo';
  const bucketId = 'discovery-files';
  const accessToken = 'sbp_ea7849340fc836fa77d381b12f758cfc1d03f405';
  
  console.log(`Setting CORS for project ${projectRef}, bucket ${bucketId}...`);
  
  // CORS configuration
  const corsConfig = [
    {
      "allowed_origins": ["https://discovery.casebuddy.live", "http://localhost:3000"],
      "allowed_methods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "allowed_headers": ["*"],
      "max_age_seconds": 3600
    }
  ];

  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/storage/buckets/${bucketId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        public: false,
        file_size_limit: 52428800, // 50MB
        allowed_mime_types: null,
        cors_rules: corsConfig
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to set CORS:', JSON.stringify(error, null, 2));
      return;
    }

    console.log('✅ CORS configuration applied successfully!');
  } catch (err) {
    console.error('Error applying CORS:', err.message);
  }
}

applySupabaseCors();
