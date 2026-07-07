'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, backgroundColor: '#030712', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxWidth: '28rem',
              width: '100%',
              backgroundColor: '#111827',
              border: '1px solid #1f2937',
              borderRadius: '1rem',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Application Error
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1.5rem' }}>
              DiscoveryLens encountered an unexpected error. Please try again.
            </p>
            {error?.message && (
              <p
                style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  backgroundColor: '#1f2937',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  marginBottom: '1.5rem',
                }}
              >
                {error.message}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
