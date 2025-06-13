const Debug = () => {
  return (
    <div className="p-8 bg-slate-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Debug Information</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Environment Variables:</h2>
          <ul className="ml-4 space-y-1">
            <li>VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ Present' : '❌ Missing'}</li>
            <li>VITE_SUPABASE_ANON_KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Present' : '❌ Missing'}</li>
            <li>VITE_CAPTURE_API_URL: {import.meta.env.VITE_CAPTURE_API_URL ? '✅ Present' : '❌ Missing'}</li>
          </ul>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Full Environment:</h2>
          <pre className="bg-slate-800 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(import.meta.env, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default Debug;
