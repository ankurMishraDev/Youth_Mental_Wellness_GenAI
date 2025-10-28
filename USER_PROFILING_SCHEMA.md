# User Profiling Schema

## Overview
This document defines the complete user profiling structure stored at `users/{uid}/user_profiling/user_details` in Firestore.

**Purpose:** Build a comprehensive longitudinal understanding of each user to provide personalized, context-aware mental wellness support.

**Update Strategy:** AI (Gemini) updates fields organically during conversations without directly asking profiling questions.

---

## Database Structure

```
Firestore:
users/
  {uid}/
    user_profiling/
      user_details (document)
        - core_identity: {...}
        - communication_profile: {...}
        - psychological_profile: {...}
        - life_context_profile: {...}
        - historical_profile: {...}
        - strengths_profile: {...}
        - behavioral_profile: {...}
        - risk_profile: {...}
        - treatment_response_profile: {...}
        - cultural_profile: {...}
        - metadata: {...}
```

---

## 1. Core Identity & Demographics

```javascript
core_identity: {
  // Basic identity information
  preferred_name: string | null,           // How they want to be addressed
  age_range: string | null,                // "15-18", "19-22", "23-28"
  gender_identity: string | null,          // Self-identified gender
  pronouns: string | null,                 // "he/him", "she/her", "they/them", etc.
  
  // Language preferences
  primary_language: string,                // "English" (default)
  language_preferences: array | null,      // ["English", "Hindi", "Hinglish"]
  
  // Location context
  cultural_background: string | null,      // General cultural context
  region: string | null,                   // "North India", "South India", etc.
  
  // Updated timestamp
  last_updated: timestamp | null
}
```

---

## 2. Communication Patterns & Style

```javascript
communication_profile: {
  // Communication style
  verbal_expressiveness: string | null,    // "highly_expressive", "reserved", "matter_of_fact"
  emotional_vocabulary_range: string | null, // "limited", "moderate", "rich"
  typical_conversation_length: string | null, // "brief", "moderate", "extensive"
  preferred_conversation_pace: string | null, // "fast", "moderate", "slow_reflective"
  
  // Expression patterns
  uses_humor: boolean | null,
  uses_sarcasm: boolean | null,
  comfort_with_vulnerability: string | null, // "high", "moderate", "low", "building"
  directness_level: string | null,         // "very_direct", "diplomatic", "indirect"
  
  // Language specifics
  code_switches: boolean | null,           // English/Hindi mixing
  common_phrases: array | null,            // User's characteristic expressions
  metaphors_used: array | null,            // How they describe feelings
  
  // Engagement patterns
  asks_clarifying_questions: boolean | null,
  reflects_back_insights: boolean | null,
  follows_up_on_suggestions: boolean | null,
  engagement_trajectory: string | null,    // "increasing", "stable", "declining"
  
  last_updated: timestamp | null
}
```

---

## 3. Psychological & Emotional Patterns

```javascript
psychological_profile: {
  // Emotional regulation
  typical_coping_mechanisms: array | null,
  // Examples: "avoidance", "seeking_social_support", "problem_solving",
  // "rumination", "distraction", "physical_activity"
  
  healthy_coping_strategies: array | null,
  unhealthy_coping_patterns: array | null,
  emotional_regulation_capacity: string | null, // "strong", "developing", "struggles"
  
  // Cognitive patterns
  thinking_styles: array | null,
  // Examples: "catastrophizing", "black_and_white_thinking",
  // "self_critical", "optimistic", "analytical", "intuitive"
  
  core_beliefs: array | null,
  // Examples: "I'm not good enough", "People will leave me",
  // "I must be perfect", "I'm capable of growth"
  
  // Stress responses
  stress_response_pattern: string | null,  // "fight", "flight", "freeze", "fawn", "mixed"
  anxiety_triggers: array | null,
  anxiety_manifestations: array | null,    // "physical_symptoms", "racing_thoughts", etc.
  
  // Mood patterns
  baseline_mood_range: string | null,      // "generally_positive", "neutral", "low", "variable"
  mood_stability: string | null,           // "stable", "fluctuating", "reactive"
  seasonal_patterns: array | null,         // Any seasonal mood changes noticed
  time_of_day_patterns: array | null,      // "worse_in_mornings", "evenings_difficult"
  
  last_updated: timestamp | null
}
```

---

## 4. Life Context & Circumstances

```javascript
life_context_profile: {
  // Academic/Career
  current_life_stage: string | null,       // "high_school", "college", "working_professional"
  academic_pressure_level: string | null,  // "high", "moderate", "low"
  career_stressors: array | null,
  academic_performance_concerns: array | null,
  upcoming_major_events: array | null,     // "board_exams_in_3_months", "job_interviews"
  
  // Social context
  living_situation: string | null,         // "with_parents", "hostel", "alone", "with_roommates"
  family_dynamics: string | null,          // "supportive", "conflicted", "distant", "complicated"
  family_relationship_quality: object | null, // {parents: "strained", siblings: "close"}
  
  peer_relationships: string | null,       // "strong_social_network", "isolated", "small_close_circle"
  romantic_relationship_status: string | null, // "single", "in_relationship", "complicated"
  social_support_level: string | null,     // "strong", "moderate", "limited", "lacking"
  
  // Financial & practical
  financial_stressors: array | null,
  housing_stability: string | null,
  access_to_resources: string | null,      // "good", "limited", "poor"
  
  last_updated: timestamp | null
}
```

---

## 5. Historical Factors & Origins

```javascript
historical_profile: {
  // Predisposing factors (distal origins)
  childhood_experiences: array | null,
  // Examples: "high_parental_expectations", "bullying_in_school",
  // "frequent_relocations", "close_family_bonds", "academic_success"
  
  significant_life_events: array | null,
  // [{"event": "parents_divorce", "age": "14", "impact": "high"}]
  
  trauma_history: boolean | null,          // Flag only, NO details stored
  trauma_disclosed: boolean,               // Has user mentioned trauma
  safe_to_reference: boolean,              // Only if user brings it up
  
  // Past mental health
  previous_mental_health_experiences: array | null,
  prior_therapy_experience: boolean | null,
  medication_history: boolean | null,
  family_mental_health_history: boolean | null,
  
  // Precipitating factors (recent triggers)
  recent_major_stressors: array | null,
  // [{"stressor": "exam_failure", "date": "2025-08", "severity": "high"}]
  
  last_updated: timestamp | null
}
```

---

## 6. Strengths & Protective Factors

```javascript
strengths_profile: {
  // Personal strengths
  character_strengths: array | null,
  // Examples: "perseverance", "creativity", "empathy", "humor",
  // "analytical_thinking", "adaptability"
  
  skills_and_capabilities: array | null,
  interests_and_passions: array | null,
  past_successes: array | null,
  
  // Resilience factors
  meaning_making_ability: string | null,   // "strong", "developing", "limited"
  growth_mindset_indicators: array | null,
  self_awareness_level: string | null,     // "high", "moderate", "developing"
  
  // Resources
  supportive_relationships: array | null,
  activities_that_help: array | null,
  values_and_motivations: array | null,
  
  last_updated: timestamp | null
}
```

---

## 7. Behavioral Patterns & Habits

```javascript
behavioral_profile: {
  // Self-care patterns
  sleep_patterns: string | null,           // "consistent_good_sleep", "irregular", "chronic_poor_sleep"
  physical_activity_habits: string | null,
  eating_patterns: string | null,
  substance_use: string | null,            // Handled sensitively
  
  // Daily functioning
  daily_routine_structure: string | null,  // "highly_structured", "flexible", "chaotic"
  productivity_patterns: string | null,
  procrastination_tendency: string | null,
  
  // Social behavior
  social_withdrawal_patterns: string | null,
  help_seeking_behavior: string | null,    // "proactive", "reluctant", "avoidant"
  boundary_setting_ability: string | null,
  
  last_updated: timestamp | null
}
```

---

## 8. Risk Factors & Safety Concerns

```javascript
risk_profile: {
  // Historical risk
  past_self_harm_behavior: boolean,        // CRITICAL - track sensitively
  past_suicidal_ideation: boolean,
  past_crisis_episodes: array | null,      // [{"date": "2024-08", "type": "...", "resolution": "..."}]
  
  // Current risk indicators
  current_warning_signs: array | null,
  protective_factors_present: array | null,
  risk_escalation_pattern: string | null,  // Pattern description if identified
  
  // Safety planning
  identified_support_persons: array | null,
  coping_strategies_for_crisis: array | null,
  emergency_resources_awareness: boolean | null,
  
  // Monitoring
  last_risk_assessment: timestamp | null,
  risk_level: string | null,               // "low", "moderate", "needs_monitoring", "high"
  
  last_updated: timestamp | null
}
```

---

## 9. Treatment Response & Progress

```javascript
treatment_response_profile: {
  // Intervention effectiveness
  helpful_exercises: array | null,         // Exercise IDs that worked
  unhelpful_exercises: array | null,
  preferred_intervention_types: array | null,
  // "cognitive_strategies", "behavioral_activation", "mindfulness", "journaling"
  
  // Engagement patterns
  follows_through_on_suggestions: boolean | null,
  reports_back_on_progress: boolean | null,
  receptive_to_feedback: boolean | null,
  resistance_patterns: array | null,
  
  // Progress indicators
  goals_identified: array | null,
  goals_achieved: array | null,
  barriers_to_progress: array | null,
  trajectory_over_time: string | null,     // "improving", "stable", "declining", "fluctuating"
  
  last_updated: timestamp | null
}
```

---

## 10. Cultural & Contextual Factors

```javascript
cultural_profile: {
  // Cultural influences
  cultural_values: array | null,
  family_cultural_expectations: array | null,
  stigma_concerns: array | null,
  
  // Identity factors (for women/marginalized users)
  gender_related_stressors: array | null,
  safety_concerns: array | null,
  discrimination_experiences: array | null,
  
  // Cultural coping
  traditional_support_systems: array | null,
  cultural_healing_practices: array | null,
  spirituality_role: string | null,
  
  // Communication considerations
  family_mh_literacy: string | null,       // "supportive", "neutral", "stigmatizing"
  comfort_discussing_mh: string | null,    // "open", "cautious", "very_private"
  
  last_updated: timestamp | null
}
```

---

## 11. Metadata

```javascript
metadata: {
  profile_created_at: timestamp,
  profile_version: string,                 // "1.0"
  total_updates: number,                   // Count of profile updates
  last_comprehensive_review: timestamp | null,
  confidence_level: string,                // "low", "building", "moderate", "high"
  data_sources: array,                     // ["conversations", "journals", "metrics"]
  
  // Validation tracking
  user_validated_fields: array | null,     // Fields user confirmed as accurate
  ai_inferred_fields: array | null,        // Fields AI extracted (pending validation)
}
```

---

## Profile Update Rules

### **For Gemini AI:**

1. **NEVER ask direct profiling questions**
   - ❌ "What's your coping mechanism?"
   - ✅ Natural conversation reveals: "You mentioned talking to friends helps - that's a great coping strategy"

2. **Always use soft language when inferring**
   - ❌ "You are avoidant"
   - ✅ "I've noticed you tend to..." or "It seems like..."

3. **Validate inferences with user**
   - After inferring: "Does this resonate with you?"
   - If user disagrees, don't store the inference

4. **Update only when confident**
   - Require multiple mentions or clear evidence
   - Mark uncertain inferences with lower confidence

5. **Respect sensitivity levels**
   - Trauma, substance use, self-harm: ONLY update if user explicitly shares
   - Never probe for sensitive information

6. **Progressive profiling**
   - Week 1-2: Core identity, communication style
   - Week 3-4: Life context, strengths
   - Month 2+: Deeper patterns, historical factors
   - Only when trust is established: Risk factors, trauma

---

## Default Values

When initializing profile for new user, all fields default to:
- Strings: `null`
- Booleans: `null` (except safety-critical ones: `false`)
- Arrays: `null` or `[]`
- Objects: `null` or `{}`

**Exception:**
```javascript
metadata: {
  profile_created_at: serverTimestamp(),
  profile_version: "1.0",
  total_updates: 0,
  confidence_level: "low",
  data_sources: []
}
```

---

## Privacy & Ethics

1. **User Ownership:** User can view, edit, delete any profile field
2. **Transparency:** AI explains why it's updating a field
3. **No Diagnosis:** Profile is for personalization, NOT clinical diagnosis
4. **Soft Guardrails:** AI uses profile to guide, not dictate
5. **Consent:** Sensitive fields require implicit consent (user mentions first)

---

## Implementation Notes

- **Storage:** Single document at `users/{uid}/user_profiling/user_details`
- **Updates:** Atomic field updates via PATCH endpoint
- **Validation:** Server-side validation for data types and values
- **Audit:** Track update history in `metadata.total_updates`
- **Context:** Fetched with summaries for every AI session
