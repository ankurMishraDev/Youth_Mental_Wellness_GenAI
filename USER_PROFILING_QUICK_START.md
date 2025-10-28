# User Profiling System - Quick Start Guide

## 🚀 How to Test

### **1. Start Servers**
```bash
# Terminal 1 - Database server
cd scripts
node db-server.js

# Terminal 2 - AI server
python server.py
```

### **2. Test Profile Initialization**
```bash
# Check if profile exists
curl http://localhost:3000/user-profile/test_user_123

# Should return: {"exists": false, "message": "Profile not initialized"}

# Initialize profile manually (or let AI auto-initialize)
curl -X POST http://localhost:3000/initialize-profile/test_user_123

# Verify profile created
curl http://localhost:3000/user-profile/test_user_123
# Should return profile with all null fields
```

### **3. Test Profile Updates**
```bash
# Update core identity
curl -X PATCH http://localhost:3000/update-profile/test_user_123 \
  -H "Content-Type: application/json" \
  -d '{
    "category": "core_identity",
    "updates": {
      "preferred_name": "Alex",
      "age_range": "19-22",
      "region": "North India"
    }
  }'

# Update communication style
curl -X PATCH http://localhost:3000/update-profile/test_user_123 \
  -H "Content-Type: application/json" \
  -d '{
    "category": "communication_profile",
    "updates": {
      "verbal_expressiveness": "highly_expressive",
      "uses_humor": true,
      "uses_sarcasm": true
    }
  }'

# Verify updates
curl http://localhost:3000/user-profile/test_user_123
```

### **4. Test AI Integration**
1. Start AI conversation with test user
2. Check AI server logs: should see "Included user profile (confidence: low) in context"
3. AI should receive profile in system instruction
4. Have multi-turn conversation
5. Share info naturally ("I'm in college", "When stressed I avoid people")
6. AI should adapt based on profile

---

## 📋 Profile Update Examples

### **During Conversation:**

**User says:** "I'm preparing for NEET, it's in 3 months"

**Gemini should infer:**
```javascript
PATCH /update-profile/{uid}
{
  "category": "life_context_profile",
  "updates": {
    "current_life_stage": "college",
    "upcoming_major_events": ["NEET_exam_in_3_months"],
    "academic_pressure_level": "high"
  }
}
```

**User says:** "When I'm stressed I just watch shows and avoid everyone"

**Gemini should infer:**
```javascript
PATCH /update-profile/{uid}
{
  "category": "psychological_profile",
  "updates": {
    "typical_coping_mechanisms": ["avoidance", "distraction"],
    "unhealthy_coping_patterns": ["social_withdrawal"]
  }
}
```

**User says:** "That breathing exercise you suggested actually helped during my panic attack!"

**Gemini should update:**
```javascript
PATCH /update-profile/{uid}
{
  "category": "treatment_response_profile",
  "updates": {
    "helpful_exercises": ["ex001"],
    "follows_through_on_suggestions": true
  }
}
```

---

## 🔍 How to Verify It's Working

### **1. Check Firestore Console**
```
Navigate to: users/{uid}/user_profiling/user_details
Verify: Document exists with fields being populated
```

### **2. Check AI Context Logs**
```python
# In server.py logs, look for:
"Included user profile (confidence: low) in context"
"Initialized empty profile for new user: {uid}"
```

### **3. Check Profile in AI Response**
- AI should adapt communication style (formal vs. casual based on profile)
- AI should reference known information naturally
- AI should suggest exercises that worked before
- AI should NOT ask questions user already answered

### **4. Monitor Profile Growth**
```bash
# Week 1
curl http://localhost:3000/user-profile/{uid}
# Should see: core_identity, communication_profile partially filled

# Week 2
# Should see: psychological_profile, life_context_profile added

# Month 2
# Should see: historical_profile, treatment_response filled
# metadata.confidence_level: "moderate" or "high"
```

---

## 🎯 Testing Checklist

- [ ] Profile auto-initializes on first AI session
- [ ] Profile appears in AI system instruction
- [ ] AI adapts communication based on profile
- [ ] Profile updates when user shares information
- [ ] Sensitive fields only update with explicit sharing
- [ ] AI validates inferences ("Does this resonate?")
- [ ] AI references past successes/strengths
- [ ] AI avoids suggesting unhelpful exercises
- [ ] Confidence level increases over sessions
- [ ] metadata.total_updates counter increments

---

## 🐛 Common Issues

### **Profile not appearing in AI context:**
- Check db-server is running on port 3000
- Verify no CORS errors in logs
- Check user_profile_response.status_code == 200

### **Profile not updating:**
- Verify PATCH endpoint works (test with curl)
- Check Gemini has update instructions in system_instruction.txt
- Ensure AI can make HTTP requests (not sandboxed)

### **Empty profile sections:**
- Normal for new users (progressive profiling)
- Takes multiple sessions to build profile
- Some categories may remain sparse (e.g., trauma_history)

---

## 📊 Expected Profile Evolution

### **After 1 Session (Week 1):**
```javascript
{
  "core_identity": {
    "age_range": "19-22",
    "region": "North India"
  },
  "communication_profile": {
    "verbal_expressiveness": "reserved",
    "typical_conversation_length": "brief"
  },
  "metadata": {
    "confidence_level": "low",
    "total_updates": 2
  }
}
```

### **After 5 Sessions (Week 2-3):**
```javascript
{
  "core_identity": {...}, // More complete
  "communication_profile": {...}, // More complete
  "psychological_profile": {
    "typical_coping_mechanisms": ["avoidance", "journaling"],
    "stress_response_pattern": "flight"
  },
  "life_context_profile": {
    "current_life_stage": "college",
    "academic_pressure_level": "high",
    "upcoming_major_events": ["NEET_exam_in_3_months"]
  },
  "strengths_profile": {
    "character_strengths": ["perseverance"],
    "past_successes": ["talked_to_friend_about_stress"]
  },
  "metadata": {
    "confidence_level": "building",
    "total_updates": 8
  }
}
```

### **After 15 Sessions (Month 2):**
```javascript
{
  // All 10 categories have some data
  "metadata": {
    "confidence_level": "moderate",
    "total_updates": 25
  }
}
```

---

## 🎓 Key Concepts

### **Organic Extraction:**
AI learns through conversation, NOT questionnaires
- ✅ Natural: User shares, AI infers
- ❌ Forced: AI asks profiling questions

### **Progressive Profiling:**
Trust builds over time
- Week 1: Surface (name, age, communication style)
- Week 3: Deeper (coping, patterns, life context)
- Month 2: Deepest (historical factors, sensitive topics)

### **Validation Loop:**
AI checks inferences
- Infer → Validate → Confirm → Store
- "I've noticed X, does that sound right?"

### **Profile as Friendship:**
Not clinical data, but deep understanding
- Like a close friend who knows you well
- Remembers what helps, what triggers you
- Adapts naturally without being obvious

---

## 🔗 Related Documentation

- **USER_PROFILING_SCHEMA.md** - Complete field definitions
- **USER_PROFILING_IMPLEMENTATION.md** - Full implementation details
- **system_instruction.txt** - Gemini profiling guidelines

---

## 🚀 Ready to Go!

Your user profiling system is complete and ready for testing. Start the servers and have conversations to see the profile build organically over time.

The AI will become smarter about each user with every interaction, providing truly personalized mental wellness support. 💙
