#!/usr/bin/env python3
"""
Test script to verify authentication fixes in WebSocket server.
This simulates multiple connections to test token refresh logic.
"""

import asyncio
import websockets
import json
import base64
import time
from datetime import datetime

# Configuration
WS_URL = "ws://localhost:8765"  # Change to your server URL
TEST_USER_ID = "dgvvEX9PEWOCQQVoLFh0HwDD8i23"  # Your test user ID
NUM_CONNECTIONS = 3  # Number of sequential connections to test
DELAY_BETWEEN_CONNECTIONS = 2  # Seconds between connections

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

async def test_single_connection(connection_num):
    """Test a single WebSocket connection."""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}🧪 Test Connection #{connection_num}{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}")
    
    start_time = time.time()
    connection_successful = False
    error_message = None
    
    try:
        # Connect to WebSocket
        print(f"⏳ Connecting to {WS_URL}...")
        async with websockets.connect(WS_URL) as websocket:
            
            # Wait for ready message
            ready_msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            ready_data = json.loads(ready_msg)
            
            if ready_data.get("type") == "ready":
                print(f"{Colors.GREEN}✅ WebSocket connected - received 'ready'{Colors.RESET}")
            
            # Send user_id
            print(f"📤 Sending user_id: {TEST_USER_ID}")
            await websocket.send(json.dumps({
                "type": "user_id",
                "data": TEST_USER_ID
            }))
            
            # Monitor status messages
            status_messages = []
            
            async def receive_messages():
                nonlocal connection_successful, error_message
                try:
                    while True:
                        message = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                        data = json.loads(message)
                        
                        msg_type = data.get("type")
                        msg_data = data.get("data", "")
                        
                        if msg_type == "status":
                            status_messages.append(msg_data)
                            print(f"📊 Status: {msg_data}")
                        
                        elif msg_type == "error":
                            error_message = msg_data
                            print(f"{Colors.RED}❌ Error received: {msg_data}{Colors.RESET}")
                            return
                        
                        elif msg_type == "session_id":
                            print(f"{Colors.GREEN}🎉 Session ID received: {msg_data[:20]}...{Colors.RESET}")
                            connection_successful = True
                            return
                        
                        elif msg_type == "audio":
                            print(f"{Colors.GREEN}🎵 Audio response received - AI is working!{Colors.RESET}")
                            connection_successful = True
                            return
                        
                        elif msg_type == "text":
                            print(f"{Colors.GREEN}💬 AI responded: {msg_data[:50]}...{Colors.RESET}")
                            connection_successful = True
                            return
                
                except asyncio.TimeoutError:
                    print(f"{Colors.YELLOW}⏱️  Timeout waiting for response{Colors.RESET}")
                except Exception as e:
                    print(f"{Colors.RED}❌ Error receiving messages: {e}{Colors.RESET}")
            
            # Wait for messages (with timeout)
            await receive_messages()
            
    except websockets.exceptions.ConnectionClosed as e:
        error_message = f"Connection closed: {e}"
        print(f"{Colors.RED}❌ {error_message}{Colors.RESET}")
    
    except asyncio.TimeoutError:
        error_message = "Connection timeout"
        print(f"{Colors.RED}❌ Connection timeout{Colors.RESET}")
    
    except Exception as e:
        error_message = str(e)
        print(f"{Colors.RED}❌ Error: {e}{Colors.RESET}")
    
    # Results
    elapsed = time.time() - start_time
    print(f"\n{Colors.BLUE}📊 Connection #{connection_num} Results:{Colors.RESET}")
    print(f"   Duration: {elapsed:.2f}s")
    
    if connection_successful:
        print(f"   {Colors.GREEN}✅ SUCCESS - AI connection established{Colors.RESET}")
    else:
        print(f"   {Colors.RED}❌ FAILED{Colors.RESET}")
        if error_message:
            print(f"   Error: {error_message}")
    
    return connection_successful

async def main():
    """Run multiple connection tests."""
    print(f"\n{Colors.BLUE}{'='*60}")
    print("🧪 WebSocket Authentication Test Suite")
    print(f"{'='*60}{Colors.RESET}\n")
    
    print(f"Configuration:")
    print(f"  • Server: {WS_URL}")
    print(f"  • User ID: {TEST_USER_ID}")
    print(f"  • Number of tests: {NUM_CONNECTIONS}")
    print(f"  • Delay between tests: {DELAY_BETWEEN_CONNECTIONS}s")
    
    results = []
    
    for i in range(1, NUM_CONNECTIONS + 1):
        success = await test_single_connection(i)
        results.append(success)
        
        # Wait before next connection (except last one)
        if i < NUM_CONNECTIONS:
            print(f"\n⏳ Waiting {DELAY_BETWEEN_CONNECTIONS}s before next test...")
            await asyncio.sleep(DELAY_BETWEEN_CONNECTIONS)
    
    # Final summary
    print(f"\n{Colors.BLUE}{'='*60}")
    print("📊 FINAL SUMMARY")
    print(f"{'='*60}{Colors.RESET}\n")
    
    successful = sum(results)
    total = len(results)
    
    for i, result in enumerate(results, 1):
        status = f"{Colors.GREEN}✅ PASS{Colors.RESET}" if result else f"{Colors.RED}❌ FAIL{Colors.RESET}"
        print(f"  Test #{i}: {status}")
    
    print(f"\n  Success Rate: {successful}/{total} ({successful/total*100:.0f}%)")
    
    if successful == total:
        print(f"\n{Colors.GREEN}🎉 ALL TESTS PASSED! Authentication is working correctly.{Colors.RESET}")
    elif successful > 0:
        print(f"\n{Colors.YELLOW}⚠️  SOME TESTS FAILED. Review the logs above.{Colors.RESET}")
    else:
        print(f"\n{Colors.RED}❌ ALL TESTS FAILED. Check server logs and authentication setup.{Colors.RESET}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Test interrupted by user{Colors.RESET}")