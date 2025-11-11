# Authentication Testing Suite

This directory contains tests to verify the authentication token refresh fixes that prevent server crashes in production.

## Test Files

### 1. `test_auth.py` (Original - Basic Connection Test)
**Purpose:** Quick connection test  
**Duration:** ~10 seconds  
**What it tests:** Initial WebSocket connection and AI initialization  
**Limitation:** ❌ Doesn't catch token expiry issues

**Run:**
```bash
python test_auth.py
```

---

### 2. `test_token_refresh.py` (NEW - Token Refresh Verification) ⭐
**Purpose:** Verify token refresh mechanism works  
**Duration:** ~2 minutes  
**What it tests:**
- Multiple rapid connections trigger token refresh
- Delayed connections still work
- No race conditions in auth code

**Run:**
```bash
python test_token_refresh.py
```

**What to watch in server logs:**
```
✅ Expected output:
   🔄 Refreshing authentication credentials...
   📊 Current token age: 245s remaining
   ✅ Token refreshed in 0.34s (expires at: 18:45:23)
   ✅ Successfully connected to Gemini LiveAPI!

❌ Error output (means fix didn't work):
   ❌ Token refresh failed
   ❌ All authentication attempts failed
```

---

### 3. `test_long_session.py` (NEW - Production Simulation) ⭐⭐⭐
**Purpose:** Simulate real production usage to catch crashes  
**Duration:** 5 minutes to 2 hours (configurable)  
**What it tests:**
- Long-running sessions don't crash
- Server handles continuous audio streaming
- Token expiry during active sessions

**Run:**
```bash
python test_long_session.py
```

**Options:**
1. Quick test (5 min) - Good for debugging
2. Medium test (30 min) - Moderate stability
3. Full test (2 hours) - Production simulation ⭐
4. Custom duration

**What it does:**
- Sends audio every 30 seconds
- Monitors for errors continuously
- Reports progress in real-time
- Shows health checks every 5 minutes

---

## Testing Strategy

### For Development (Quick Iteration)
```bash
# 1. Start server
python server.py

# 2. In another terminal, run quick tests
python test_token_refresh.py    # ~2 minutes
python test_long_session.py     # Choose option 1 (5 min)
```

### For Pre-Production (Thorough Testing)
```bash
# Run medium test to catch most issues
python test_long_session.py     # Choose option 2 (30 min)
```

### For Production Validation (Full Test)
```bash
# Run full 2-hour test overnight
python test_long_session.py     # Choose option 3 (2 hours)
```

---

## Understanding the Fix

### What Was Broken
```python
# OLD CODE (buggy):
fresh_creds = service_account.Credentials.from_service_account_file(...)
fresh_creds.refresh(Request())

client = genai.Client(credentials=fresh_creds)  # ❌ Global 'creds' not updated!
```

**Problem:** Tokens expire after ~1 hour, causing crashes.

### What Was Fixed
```python
# NEW CODE (fixed):
global client, creds  # ✅ Declare we're updating global

creds.refresh(Request())  # ✅ Refresh existing global credentials

client = genai.Client(credentials=creds)  # ✅ Use updated global creds
```

**Result:** Tokens refresh properly, no crashes.

---

## Monitoring Production

### Log Messages to Watch For

**✅ Good (everything working):**
```
🔄 Refreshing authentication credentials...
📊 Current token age: 245s remaining
✅ Token refreshed in 0.34s (expires at: 18:45:23)
⏳ Attempting LiveAPI connection with fresh credentials...
✅ Successfully connected to Gemini LiveAPI! (total time: 1.87s)
```

**❌ Bad (fix didn't work):**
```
❌ Token refresh failed: ...
❌ All authentication attempts failed: ...
❌ Authentication failed: Unable to connect to AI service
```

**⚠️ Warning (needs investigation):**
```
⚠️ Slow generation detected (>20.0s)
⏱️  Context generation took XXs
```

---

## Troubleshooting

### Test fails immediately
**Issue:** Can't connect to server  
**Fix:** Make sure `python server.py` is running on port 8765

### Test passes but production still crashes
**Issue:** Need longer test duration  
**Fix:** Run the full 2-hour test to simulate real token expiry

### Token refresh logs not appearing
**Issue:** Tokens might still be valid  
**Fix:** 
1. Restart server to reset token age
2. Temporarily edit `server.py` line 111:
   ```python
   # Change this:
   def should_refresh_token(creds, buffer_seconds=300):
   
   # To this (for testing only):
   def should_refresh_token(creds, buffer_seconds=30):
   ```
   This forces refresh every 30 seconds instead of 5 minutes

---

## Expected Results

### Before Fix
```
Session works fine for ~50-60 minutes
❌ Then crashes with auth errors
User has to refresh browser/reconnect
```

### After Fix
```
Session works indefinitely
✅ Token refreshes automatically every ~55 minutes
✅ User never disconnected
✅ No manual intervention needed
```

---

## Quick Reference

| Test | Duration | Purpose | When to Use |
|------|----------|---------|-------------|
| `test_auth.py` | 10s | Basic connection | ❌ Not useful for token issues |
| `test_token_refresh.py` | 2min | Verify refresh works | ✅ Quick validation |
| `test_long_session.py` (quick) | 5min | Rapid debugging | ✅ During development |
| `test_long_session.py` (medium) | 30min | Pre-deployment check | ✅ Before production |
| `test_long_session.py` (full) | 2hr | Production simulation | ✅ Final validation |

---

## Success Criteria

✅ **Fix is working if:**
- `test_token_refresh.py` passes all tests
- `test_long_session.py` runs for 2 hours without errors
- Server logs show "✅ Token refreshed" messages
- No "❌ Authentication failed" errors in logs

❌ **Fix is NOT working if:**
- Tests crash after 50-60 minutes
- See "❌ Token refresh failed" in logs
- Connection closes unexpectedly
- Need to restart server frequently
