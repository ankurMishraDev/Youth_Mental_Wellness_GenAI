import { NextRequest } from 'next/server';
import { proxyDatabaseRequest } from '@/lib/server/proxy-db';

export async function POST(request: NextRequest) {
  return proxyDatabaseRequest(request, '/get-session-summaries');
}
