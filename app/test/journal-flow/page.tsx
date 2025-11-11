'use client';

import { useState } from 'react';

export default function TestJournalFlowPage() {
  const [uid, setUid] = useState('TaaC9WkqQ5VPhI0D2A4DTmzWVLO2');
  const [title, setTitle] = useState('Test Journal Entry');
  const [mood, setMood] = useState('happy');
  const [content, setContent] = useState('Today was a great day! I finished my project at work and got positive feedback from my manager. Feeling accomplished and motivated for tomorrow.');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async () => {
    setLoading(true);
    setResponse(null);
    setError(null);

    try {
      console.log('📝 [TEST] Submitting journal entry...');
      console.log('User ID:', uid);
      console.log('Title:', title);
      console.log('Mood:', mood);
      console.log('Content length:', content.length);

      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': uid,
        },
        body: JSON.stringify({
          title,
          mood,
          content,
          autoCategorize: false,
        }),
      });

      console.log('📨 [TEST] Response status:', res.status);

      const data = await res.json();
      console.log('📨 [TEST] Response data:', data);

      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      setResponse(data);
      console.log('✅ [TEST] Journal entry submitted successfully!');
    } catch (err: any) {
      console.error('❌ [TEST] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Test Journal Entry Flow
          </h1>
          <p className="text-gray-600 mb-8">
            Test the complete flow: Frontend → Next.js API → Python AI Server → db-server → Firestore
          </p>

          <div className="space-y-6">
            {/* User ID */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                User ID:
              </label>
              <input
                type="text"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter user ID"
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Journal Title:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter title"
              />
            </div>

            {/* Mood */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mood:
              </label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="very-happy">😄 Very Happy</option>
                <option value="happy">🙂 Happy</option>
                <option value="neutral">😐 Neutral</option>
                <option value="sad">😔 Sad</option>
                <option value="very-sad">😢 Very Sad</option>
              </select>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Journal Content:
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="Write your journal entry..."
              />
              <p className="text-sm text-gray-500 mt-1">
                {content.length} characters
              </p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={loading || !uid || !content}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '⏳ Processing...' : '🚀 Submit Journal Entry'}
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">📋 What to Check:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li><strong>Next.js Terminal:</strong> Look for "[JOURNAL API]" logs</li>
              <li><strong>Python Terminal (journal-ai-server.py):</strong> Look for "[JOURNAL METRICS]" logs</li>
              <li><strong>Node Terminal (db-server.js):</strong> Look for "[JOURNAL METRICS]" and "[CHECK-IN]" logs</li>
              <li><strong>Response Below:</strong> Should show entry ID and success status</li>
              <li><strong>Dashboard:</strong> Check for new "Wrote Journal Entry" check-in</li>
            </ol>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <h3 className="font-semibold text-red-900 mb-2">❌ Error:</h3>
              <pre className="text-sm text-red-800 overflow-auto">
                {error}
              </pre>
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-900 mb-2">✅ Success! Response:</h3>
              <pre className="text-sm text-green-800 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(response, null, 2)}
              </pre>
              <div className="mt-4 p-3 bg-white rounded border border-green-300">
                <p className="text-sm text-green-900">
                  <strong>Entry ID:</strong> <code className="bg-green-100 px-2 py-1 rounded">{response.entry}</code>
                </p>
                <p className="text-sm text-green-700 mt-2">
                  Now check your dashboard for the "Wrote Journal Entry" check-in!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Terminal Output Hints */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs">
            <div className="font-bold text-green-300 mb-2">Next.js Terminal:</div>
            <div>📊 [JOURNAL API] Extracting metrics...</div>
            <div>🚀 [JOURNAL API] Calling: http://localhost:8766...</div>
            <div>✅ [JOURNAL API] Metrics extracted</div>
          </div>

          <div className="bg-gray-900 text-yellow-400 p-4 rounded-lg font-mono text-xs">
            <div className="font-bold text-yellow-300 mb-2">Python Terminal:</div>
            <div>📝 [JOURNAL METRICS] NEW REQUEST</div>
            <div>🔬 [JOURNAL METRICS] Extracting metrics...</div>
            <div>🚀 [JOURNAL METRICS] Sending to db-server...</div>
          </div>

          <div className="bg-gray-900 text-blue-400 p-4 rounded-lg font-mono text-xs">
            <div className="font-bold text-blue-300 mb-2">Node Terminal:</div>
            <div>📝 [JOURNAL METRICS] Received request</div>
            <div>🔍 [CHECK-IN] Checking for recent activity...</div>
            <div>✅ [CHECK-IN] Activity log created</div>
          </div>
        </div>
      </div>
    </div>
  );
}
