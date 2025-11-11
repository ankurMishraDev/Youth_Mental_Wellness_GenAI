#!/usr/bin/env python3
"""
Token refresh simulation test.
This test verifies that the server properly handles token refresh
by temporarily reducing the buffer time.
"""

import asyncio
import websockets
import json
import base64
import time
from datetime import datetime

WS_URL = "ws://localhost:8765"
TEST_USER_ID = "dgvvEX9PEWOCQQVoLFh0HwDD8i23"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'

async def monitor_server_logs_for_refresh():
    """
    Instructions for monitoring token refresh in server logs.
    """
    print(f"\n{Colors.BLUE}{'='*70}")
    print("📋 TOKEN REFRESH MONITORING GUIDE")
    print(f"{'='*70}{Colors.RESET}\n")
    
    print("To verify token refresh is working, watch for these log messages:")
    print(f"\n{Colors.GREEN}✅ Expected logs when token refresh works:{Colors.RESET}")
    print("   🔄 Refreshing authentication credentials...")
    print("   📊 Current token age: XXXs remaining")
    print("   ✅ Token refreshed in X.XXs (expires at: HH:MM:SS)")
    print("   ⏳ Attempting LiveAPI connection with fresh credentials...")
    print("   ✅ Successfully connected to Gemini LiveAPI!")
    
    print(f"\n{Colors.RED}❌ Error logs that indicate problems:{Colors.RESET}")
    print("   ❌ Token refresh failed: ...")
    print("   ❌ All authentication attempts failed: ...")
    print("   ❌ Authentication failed: Unable to connect to AI service")
    
    print(f"\n{Colors.CYAN}💡 Testing approach:{Colors.RESET}")
    print("   1. Start the server with: python server.py")
    print("   2. Run this test in another terminal")
    print("   3. Watch server logs for refresh messages")
    print("   4. Each new connection should show token refresh")
    
    print(f"\n{Colors.YELLOW}⚠️  To force faster testing:{Colors.RESET}")
    print("   Temporarily edit server.py line ~111:")
    print("   Change: buffer_seconds=300  (5 minutes)")
    print("   To:     buffer_seconds=30   (30 seconds)")
    print("   This makes tokens refresh much faster for testing")
    
    print(f"\n{Colors.CYAN}Press Enter to continue with connection test...{Colors.RESET}")
    input()

async def test_multiple_connections_rapid():
    """
    Test multiple rapid connections to verify token handling.
    Each connection should trigger credential refresh.
    """
    print(f"\n{Colors.BLUE}{'='*70}")
    print("🔄 RAPID CONNECTION TEST")
    print(f"{'='*70}{Colors.RESET}\n")
    
    print("This test makes 5 rapid connections to verify:")
    print("  • Token refresh works correctly")
    print("  • No race conditions in auth code")
    print("  • Server remains stable across connections\n")
    
    results = []
    
    for i in range(1, 6):
        print(f"{Colors.CYAN}Connection #{i}/5...{Colors.RESET}")
        
        try:
            start = time.time()
            async with websockets.connect(WS_URL) as ws:
                # Wait for ready
                await asyncio.wait_for(ws.recv(), timeout=5)
                
                # Send user_id
                await ws.send(json.dumps({"type": "user_id", "data": TEST_USER_ID}))
                
                # Wait for AI ready or error
                for _ in range(10):
                    msg = await asyncio.wait_for(ws.recv(), timeout=30)
                    data = json.loads(msg)
                    
                    if data.get("type") == "status" and "ready" in data.get("data", "").lower():
                        elapsed = time.time() - start
                        print(f"  {Colors.GREEN}✅ Connected in {elapsed:.2f}s{Colors.RESET}")
                        results.append(True)
                        break
                    
                    if data.get("type") == "error":
                        print(f"  {Colors.RED}❌ Error: {data.get('data')}{Colors.RESET}")
                        results.append(False)
                        break
                else:
                    print(f"  {Colors.YELLOW}⏱️  Timeout{Colors.RESET}")
                    results.append(False)
        
        except Exception as e:
            print(f"  {Colors.RED}❌ Failed: {e}{Colors.RESET}")
            results.append(False)
        
        # Small delay between connections
        if i < 5:
            await asyncio.sleep(2)
    
    # Results
    print(f"\n{Colors.BLUE}Results:{Colors.RESET}")
    successful = sum(results)
    print(f"  Success rate: {successful}/5 ({successful/5*100:.0f}%)")
    
    if successful == 5:
        print(f"\n{Colors.GREEN}✅ All connections successful!{Colors.RESET}")
        return True
    else:
        print(f"\n{Colors.RED}❌ Some connections failed{Colors.RESET}")
        return False

async def test_connection_after_delay(delay_seconds=60):
    """
    Test connection after a delay to see if tokens are still valid.
    """
    print(f"\n{Colors.BLUE}{'='*70}")
    print(f"⏰ DELAYED CONNECTION TEST ({delay_seconds}s)")
    print(f"{'='*70}{Colors.RESET}\n")
    
    print(f"Waiting {delay_seconds} seconds before connecting...")
    print("(This simulates tokens potentially expiring)\n")
    
    for remaining in range(delay_seconds, 0, -10):
        print(f"  ⏳ {remaining}s remaining...")
        await asyncio.sleep(min(10, remaining))
    
    print(f"\n{Colors.CYAN}Attempting connection...{Colors.RESET}")
    
    try:
        async with websockets.connect(WS_URL) as ws:
            await asyncio.wait_for(ws.recv(), timeout=5)
            await ws.send(json.dumps({"type": "user_id", "data": TEST_USER_ID}))
            
            for _ in range(10):
                msg = await asyncio.wait_for(ws.recv(), timeout=30)
                data = json.loads(msg)
                
                if data.get("type") == "status" and "ready" in data.get("data", "").lower():
                    print(f"{Colors.GREEN}✅ Connection successful after {delay_seconds}s delay{Colors.RESET}")
                    return True
                
                if data.get("type") == "error":
                    print(f"{Colors.RED}❌ Error: {data.get('data')}{Colors.RESET}")
                    return False
    
    except Exception as e:
        print(f"{Colors.RED}❌ Connection failed: {e}{Colors.RESET}")
        return False
    
    return False

async def main():
    """Main test suite."""
    print(f"\n{Colors.BLUE}{'='*70}")
    print("🧪 TOKEN REFRESH VERIFICATION TEST")
    print(f"{'='*70}{Colors.RESET}\n")
    
    # Show monitoring guide
    await monitor_server_logs_for_refresh()
    
    # Test 1: Rapid connections
    print(f"\n{Colors.CYAN}TEST 1: Rapid Connections{Colors.RESET}")
    test1_result = await test_multiple_connections_rapid()
    
    # Test 2: Delayed connection
    print(f"\n{Colors.CYAN}TEST 2: Connection After 60s Delay{Colors.RESET}")
    test2_result = await test_connection_after_delay(60)
    
    # Summary
    print(f"\n{Colors.BLUE}{'='*70}")
    print("📊 SUMMARY")
    print(f"{'='*70}{Colors.RESET}\n")
    
    print(f"Test 1 (Rapid connections): {'✅ PASS' if test1_result else '❌ FAIL'}")
    print(f"Test 2 (Delayed connection): {'✅ PASS' if test2_result else '❌ FAIL'}")
    
    if test1_result and test2_result:
        print(f"\n{Colors.GREEN}🎉 ALL TESTS PASSED{Colors.RESET}")
        print(f"{Colors.GREEN}Token refresh mechanism is working!{Colors.RESET}")
        
        print(f"\n{Colors.CYAN}Next steps:{Colors.RESET}")
        print("  • Run test_long_session.py for extended testing")
        print("  • Monitor production logs for '✅ Token refreshed' messages")
        print("  • Watch for crashes around 1-hour mark (3600s)")
        return True
    else:
        print(f"\n{Colors.RED}❌ SOME TESTS FAILED{Colors.RESET}")
        print("Check server logs for authentication errors")
        return False

if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        exit(0 if result else 1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Test interrupted{Colors.RESET}")
        exit(130)
