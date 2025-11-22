export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center p-8">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl p-12">
        <h1 className="text-5xl font-bold mb-4 uppercase">
          📊 WhatsApp Data Analyst
        </h1>
        <p className="text-xl mb-6 font-mono">
          AI-powered CSV analysis via WhatsApp
        </p>
        
        <div className="bg-yellow-300 border-2 border-black p-6 mb-6">
          <h2 className="text-2xl font-bold mb-3">How it works:</h2>
          <ol className="list-decimal list-inside space-y-2 font-mono">
            <li>Send a CSV file to our WhatsApp number</li>
            <li>AI analyzes trends with Python + SQL</li>
            <li>Web search explains anomalies (Exa)</li>
            <li>Receive a beautiful PDF report</li>
          </ol>
        </div>

        <div className="bg-green-300 border-2 border-black p-6 mb-6">
          <h3 className="text-xl font-bold mb-2">🚀 Tech Stack:</h3>
          <div className="flex flex-wrap gap-2 font-mono">
            <span className="bg-black text-white px-3 py-1 border-2 border-black">E2B</span>
            <span className="bg-black text-white px-3 py-1 border-2 border-black">Groq</span>
            <span className="bg-black text-white px-3 py-1 border-2 border-black">Exa MCP</span>
            <span className="bg-black text-white px-3 py-1 border-2 border-black">Vercel AI SDK</span>
            <span className="bg-black text-white px-3 py-1 border-2 border-black">Puppeteer</span>
          </div>
        </div>

        <div className="text-center">
          <a 
            href={process.env.NEXT_PUBLIC_WHATSAPP_URL || '#'}
            className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all uppercase text-lg"
          >
            📱 Try it on WhatsApp
          </a>
        </div>

        <p className="text-center mt-6 text-sm font-mono opacity-70">
          Status: {' '}
          <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
          {' '} API Active
        </p>
      </div>
    </main>
  );
}

