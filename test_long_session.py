#!/usr/bin/env python3
"""
Long-running session test to verify authentication fixes.
This simulates real user behavior over extended periods to catch token expiry issues.
"""

import asyncio
import websockets
import json
import base64
import time
from datetime import datetime, timedelta

# Configuration
WS_URL = "ws://localhost:8765"
TEST_USER_ID = "dgvvEX9PEWOCQQVoLFh0HwDD8i23"
TEST_DURATION_MINUTES = 120  # 2 hours by default
AUDIO_INTERVAL_SECONDS = 30  # Send audio every 30 seconds
HEALTH_CHECK_INTERVAL = 300  # Check status every 5 minutes

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'

def format_duration(seconds):
    """Format seconds into human-readable duration."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours}h {minutes}m {secs}s"

async def long_running_session_test(duration_minutes=120):
    """
    Test a long-running session to verify authentication doesn't fail over time.
    This is the critical test for token refresh logic.
    """
    print(f"\n{Colors.BLUE}{'='*70}")
    print("🧪 LONG-RUNNING SESSION TEST")
    print(f"{'='*70}{Colors.RESET}\n")
    
    print(f"Configuration:")
    print(f"  • Server: {WS_URL}")
    print(f"  • User ID: {TEST_USER_ID}")
    print(f"  • Duration: {duration_minutes} minutes")
    print(f"  • Audio interval: {AUDIO_INTERVAL_SECONDS}s")
    print(f"  • Health checks: every {HEALTH_CHECK_INTERVAL}s")
    
    start_time = time.time()
    end_time = start_time + (duration_minutes * 60)
    cycles_completed = 0
    errors_encountered = []
    last_health_check = start_time
    
    # Create dummy audio data (16-bit PCM silence)
    dummy_audio = base64.b64encode(b'\x00' * 3200).decode('utf-8')  # ~100ms of silence
    
    try:
        print(f"\n{Colors.CYAN}⏳ Connecting to WebSocket...{Colors.RESET}")
        async with websockets.connect(WS_URL) as websocket:
            
            # Step 1: Wait for ready message
            ready_msg = await asyncio.wait_for(websocket.recv(), timeout=10.0)
            ready_data = json.loads(ready_msg)
            
            if ready_data.get("type") == "ready":
                print(f"{Colors.GREEN}✅ WebSocket connected - received 'ready'{Colors.RESET}")
            
            # Step 2: Send user_id
            print(f"{Colors.CYAN}📤 Sending user_id...{Colors.RESET}")
            await websocket.send(json.dumps({
                "type": "user_id",
                "data": TEST_USER_ID
            }))
            
            # Step 3: Wait for AI to be ready
            print(f"{Colors.CYAN}⏳ Waiting for AI companion to initialize...{Colors.RESET}")
            ai_ready = False
            
            for _ in range(60):  # Wait up to 60 messages
                try:
                    msg = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                    data = json.loads(msg)
                    
                    if data.get("type") == "status":
                        status_text = data.get("data", "")
                        print(f"   📊 Status: {status_text}")
                        
                        if "ready" in status_text.lower() or "start talking" in status_text.lower():
                            ai_ready = True
                            print(f"{Colors.GREEN}✅ AI companion ready!{Colors.RESET}")
                            break
                    
                    elif data.get("type") == "error":
                        error_msg = data.get("data", "Unknown error")
                        print(f"{Colors.RED}❌ Error during setup: {error_msg}{Colors.RESET}")
                        return False
                    
                    elif data.get("type") == "session_id":
                        print(f"{Colors.GREEN}✅ Session ID received{Colors.RESET}")
                
                except asyncio.TimeoutError:
                    print(f"{Colors.YELLOW}⏱️  Still waiting for AI initialization...{Colors.RESET}")
                    break
            
            if not ai_ready:
                print(f"{Colors.YELLOW}⚠️  AI didn't confirm ready, but proceeding with test...{Colors.RESET}")
            
            # Step 4: Long-running session loop
            print(f"\n{Colors.BLUE}{'='*70}")
            print(f"🚀 STARTING LONG-RUNNING TEST")
            print(f"{'='*70}{Colors.RESET}\n")
            print(f"Target: {duration_minutes} minutes ({duration_minutes * 60 / AUDIO_INTERVAL_SECONDS:.0f} cycles)")
            print(f"Press Ctrl+C to stop early\n")
            
            # Background task to receive messages
            received_messages = []
            
            async def receive_messages():
                try:
                    while True:
                        msg = await websocket.recv()
                        data = json.loads(msg)
                        received_messages.append({
                            "time": time.time(),
                            "type": data.get("type"),
                            "data": data.get("data", "")
                        })
                        
                        if data.get("type") == "error":
                            error_msg = data.get("data", "")
                            errors_encountered.append({
                                "time": time.time() - start_time,
                                "error": error_msg
                            })
                            print(f"\n{Colors.RED}❌ ERROR at {format_duration(time.time() - start_time)}: {error_msg}{Colors.RESET}\n")
                
                except websockets.exceptions.ConnectionClosed as e:
                    print(f"\n{Colors.RED}❌ Connection closed: {e}{Colors.RESET}\n")
                except Exception as e:
                    print(f"\n{Colors.RED}❌ Error receiving: {e}{Colors.RESET}\n")
            
            # Start receiver task
            receiver_task = asyncio.create_task(receive_messages())
            
            # Main test loop
            try:
                while time.time() < end_time:
                    current_time = time.time()
                    elapsed = current_time - start_time
                    remaining = end_time - current_time
                    
                    # Send audio chunk
                    try:
                        await websocket.send(json.dumps({
                            "type": "audio",
                            "data": dummy_audio
                        }))
                        
                        cycles_completed += 1
                        
                        # Progress update every cycle
                        progress = (elapsed / (duration_minutes * 60)) * 100
                        print(f"🔄 Cycle {cycles_completed:4d} | "
                              f"Elapsed: {format_duration(elapsed):>12s} | "
                              f"Remaining: {format_duration(remaining):>12s} | "
                              f"Progress: {progress:5.1f}% | "
                              f"Errors: {len(errors_encountered)}")
                        
                        # Health check
                        if current_time - last_health_check >= HEALTH_CHECK_INTERVAL:
                            messages_received = len([m for m in received_messages if m["time"] > last_health_check])
                            print(f"\n{Colors.CYAN}💊 Health Check:{Colors.RESET}")
                            print(f"   • Connection: {Colors.GREEN}ALIVE{Colors.RESET}")
                            print(f"   • Messages received (last {HEALTH_CHECK_INTERVAL}s): {messages_received}")
                            print(f"   • Total errors: {len(errors_encountered)}")
                            print()
                            last_health_check = current_time
                        
                        # Wait for next interval
                        await asyncio.sleep(AUDIO_INTERVAL_SECONDS)
                    
                    except websockets.exceptions.ConnectionClosed as e:
                        print(f"\n{Colors.RED}❌ CONNECTION LOST at {format_duration(elapsed)}{Colors.RESET}")
                        print(f"   Reason: {e}")
                        errors_encountered.append({
                            "time": elapsed,
                            "error": f"Connection closed: {e}"
                        })
                        return False
                    
                    except Exception as e:
                        print(f"\n{Colors.RED}❌ ERROR at {format_duration(elapsed)}: {e}{Colors.RESET}\n")
                        errors_encountered.append({
                            "time": elapsed,
                            "error": str(e)
                        })
                        # Continue despite error
                
                # Test completed successfully
                receiver_task.cancel()
                
            except asyncio.CancelledError:
                print(f"\n{Colors.YELLOW}Test interrupted{Colors.RESET}")
                return False
            
    except websockets.exceptions.ConnectionRefused:
        print(f"{Colors.RED}❌ Cannot connect to server at {WS_URL}{Colors.RESET}")
        print(f"   Make sure the server is running!")
        return False
    
    except Exception as e:
        print(f"{Colors.RED}❌ Fatal error: {e}{Colors.RESET}")
        import traceback
        traceback.print_exc()
        return False
    
    # Final results
    total_duration = time.time() - start_time
    
    print(f"\n{Colors.BLUE}{'='*70}")
    print("📊 TEST RESULTS")
    print(f"{'='*70}{Colors.RESET}\n")
    
    print(f"Duration: {format_duration(total_duration)}")
    print(f"Cycles completed: {cycles_completed}")
    print(f"Expected cycles: {int(duration_minutes * 60 / AUDIO_INTERVAL_SECONDS)}")
    print(f"Errors encountered: {len(errors_encountered)}")
    
    if errors_encountered:
        print(f"\n{Colors.RED}❌ ERRORS:{Colors.RESET}")
        for err in errors_encountered[:10]:  # Show first 10 errors
            print(f"   • {format_duration(err['time'])}: {err['error']}")
        if len(errors_encountered) > 10:
            print(f"   ... and {len(errors_encountered) - 10} more errors")
    
    if len(errors_encountered) == 0 and cycles_completed >= (duration_minutes * 60 / AUDIO_INTERVAL_SECONDS * 0.95):
        print(f"\n{Colors.GREEN}🎉 TEST PASSED!{Colors.RESET}")
        print(f"{Colors.GREEN}Session remained stable for {format_duration(total_duration)}{Colors.RESET}")
        print(f"{Colors.GREEN}Authentication fixes are working correctly!{Colors.RESET}")
        return True
    elif len(errors_encountered) == 0:
        print(f"\n{Colors.YELLOW}⚠️  TEST INCOMPLETE{Colors.RESET}")
        print(f"Completed {cycles_completed} cycles but expected more")
        return False
    else:
        print(f"\n{Colors.RED}❌ TEST FAILED{Colors.RESET}")
        print(f"Errors occurred during long-running session")
        return False

async def quick_stability_test():
    """
    Quick 5-minute test to verify basic stability.
    Useful for rapid iteration during debugging.
    """
    print(f"\n{Colors.CYAN}⚡ Running QUICK stability test (5 minutes)...{Colors.RESET}\n")
    return await long_running_session_test(duration_minutes=5)

async def full_production_test():
    """
    Full 2-hour test simulating production environment.
    This should catch token expiry issues.
    """
    print(f"\n{Colors.CYAN}🏭 Running FULL production test (2 hours)...{Colors.RESET}\n")
    return await long_running_session_test(duration_minutes=120)

async def main():
    """Main entry point with test selection."""
    print(f"\n{Colors.BLUE}{'='*70}")
    print("🧪 AUTHENTICATION & STABILITY TEST SUITE")
    print(f"{'='*70}{Colors.RESET}\n")
    
    print("Select test type:")
    print("  1. Quick test (5 minutes) - Good for debugging")
    print("  2. Medium test (30 minutes) - Moderate stability check")
    print("  3. Full test (2 hours) - Production simulation")
    print("  4. Custom duration")
    
    try:
        choice = input(f"\n{Colors.CYAN}Enter choice (1-4) [default: 1]: {Colors.RESET}").strip() or "1"
        
        if choice == "1":
            success = await quick_stability_test()
        elif choice == "2":
            success = await long_running_session_test(duration_minutes=30)
        elif choice == "3":
            success = await full_production_test()
        elif choice == "4":
            minutes = int(input(f"{Colors.CYAN}Enter duration in minutes: {Colors.RESET}"))
            success = await long_running_session_test(duration_minutes=minutes)
        else:
            print(f"{Colors.RED}Invalid choice{Colors.RESET}")
            return
        
        return success
    
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Test interrupted by user{Colors.RESET}")
        return False
    except Exception as e:
        print(f"\n{Colors.RED}Error: {e}{Colors.RESET}")
        return False

if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        exit(0 if result else 1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Exiting...{Colors.RESET}")
        exit(130)
