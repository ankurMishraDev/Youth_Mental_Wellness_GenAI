# Database Schema Migration - Complete ✅

## Migration Summary
Successfully migrated from flat collection structure to nested subcollection architecture.

## New Database Structure

```
Firestore Root
└── users (collection)
    └── {uid} (document)
        ├── summaries (subcollection)
        │   └── latestSummary (document)
        │       ├── summary_data
        │       │   ├── mood_percentage
        │       │   ├── energy_level
        │       │   ├── stress_level
        │       │   └── ...
        │       └── meta
        │           ├── client_id
        │           ├── session_id
        │           └── saved_at_utc
        │
        ├── journalEntries (subcollection)
        │   └── {entryId} (document)
        │       ├── title
        │       ├── content (Portable Text)
        │       ├── mood
        │       ├── images[]
        │       ├── categoryId
        │       ├── createdAt
        │       └── updatedAt
        │
        ├── user_profiling (subcollection)
        │   └── profile (document)
        │       ├── email
        │       ├── name
        │       ├── age
        │       ├── gender
        │       ├── emailVerified
        │       ├── createdAt
        │       └── updatedAt
        │
        └── metrics (subcollection)
            └── mood_history (document)
                ├── moods: []  (array - placeholder for future)
                └── createdAt

categories (collection - remains at root level)
└── {categoryId} (document)
    ├── title
    ├── description
    ├── color
    ├── userId (null for default, uid for custom)
    ├── isDefault
    └── createdAt
```

## Files Updated

### 1. Backend (Node.js Express) - `scripts/db-server.js`
**Endpoints Updated:**
- ✅ `POST /signup` - Creates user_profiling/profile + metrics/mood_history
- ✅ `POST /login` - Reads from user_profiling/profile
- ✅ `POST /save-summary` - Writes to summaries/latestSummary
- ✅ `POST /save-name` - Updates user_profiling/profile
- ✅ `POST /update-profile` - Updates user_profiling/profile
- ✅ `GET /get-summary/:uid` - Reads from summaries/latestSummary
- ✅ `GET /user/:uid` - Reads from user_profiling/profile + summaries/latestSummary
- ✅ `POST /get-user-context` - Reads from journalEntries subcollection
- ✅ `POST /seed-categories` - Unchanged (root level categories)

**Key Changes:**
- Removed `userId` field from journal entries (implicit in path)
- Added initialization of metrics collection with empty moods array
- Parallel reads for profile + summary in /user/:uid endpoint
- Updated journal queries to use subcollection path

### 2. Firebase Client Library - `lib/firebase/journal.ts`
**Functions Updated:**
- ✅ `createJournalEntry()` - Writes to users/{uid}/journalEntries
- ✅ `getJournalEntries()` - Reads from users/{uid}/journalEntries
- ✅ `getJournalEntryById()` - Reads from users/{uid}/journalEntries/{entryId}
- ✅ `updateJournalEntry()` - Updates users/{uid}/journalEntries/{entryId}
- ✅ `deleteJournalEntry()` - Deletes from users/{uid}/journalEntries/{entryId}

**Helper Added:**
```typescript
const getUserJournalCollection = (userId: string) => {
  return collection(db, 'users', userId, 'journalEntries');
};
```

### 3. Python Servers
**No Changes Required:**
- ✅ `server.py` - Uses Node.js backend via HTTP (automatically updated)
- ✅ `journal-ai-server.py` - Uses Node.js backend via HTTP (automatically updated)

### 4. Next.js API Routes
**No Changes Required:**
- ✅ `/api/journal/route.ts` - Uses updated journal.ts functions
- ✅ `/api/journal/[id]/route.ts` - Uses updated journal.ts functions
- ✅ All other routes use the abstraction layer

## Benefits of New Structure

### 1. **Data Isolation & Security**
- Each user's data is scoped under their UID
- Firestore security rules are simpler:
  ```javascript
  match /users/{userId}/journalEntries/{entryId} {
    allow read, write: if request.auth.uid == userId;
  }
  ```

### 2. **Query Performance**
- No more global queries with `where('userId', '==', uid)`
- Direct subcollection access is faster
- Better indexing efficiency

### 3. **Scalability**
- Subcollections can grow independently
- No single collection limit concerns
- Better sharding across Firestore nodes

### 4. **Data Management**
- Export/delete user data by UID path
- GDPR compliance simplified
- Clear data ownership model

### 5. **Future-Ready**
- `metrics` collection ready for analytics
- Can add more subcollections easily:
  - `achievements`
  - `daily_reflections`
  - `wellness_scores`

## Testing Checklist

### Authentication Flow
- [ ] New user signup creates all subcollections
- [ ] Login retrieves profile from user_profiling/profile
- [ ] Profile updates work correctly
- [ ] Email verification flow intact

### AI Session Flow
- [ ] Start session initializes properly
- [ ] Session summary saves to summaries/latestSummary
- [ ] Dashboard displays mood data correctly
- [ ] Historical session data accessible

### Journal Flow
- [ ] Create entry → saves to users/{uid}/journalEntries
- [ ] List entries → fetches from correct subcollection
- [ ] Update entry → modifies correct document
- [ ] Delete entry → removes from subcollection
- [ ] Image upload/deletion works
- [ ] Category filtering works
- [ ] Date range filtering works

### Dashboard
- [ ] Home page displays mood summary
- [ ] Sessions page shows latest summary
- [ ] Profile page loads correctly
- [ ] Resources page functions

## Migration Strategy (If Needed)

If you have existing data, run this migration script:

```javascript
// scripts/migrate-to-subcollections.js
const admin = require("firebase-admin");
const serviceAccount = require("./admin-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrateData() {
  console.log("🚀 Starting migration...");
  
  // 1. Migrate user profiles
  const usersSnapshot = await db.collection("users").get();
  
  for (const userDoc of usersSnapshot.docs) {
    const uid = userDoc.id;
    const userData = userDoc.data();
    
    console.log(`Migrating user: ${uid}`);
    
    // Move profile data
    if (userData.email || userData.name) {
      await db.collection("users").doc(uid)
        .collection("user_profiling").doc("profile")
        .set({
          email: userData.email,
          name: userData.name,
          age: userData.age,
          gender: userData.gender,
          emailVerified: userData.emailVerified,
          createdAt: userData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    
    // Move summary data
    if (userData.latestSummary) {
      await db.collection("users").doc(uid)
        .collection("summaries").doc("latestSummary")
        .set(userData.latestSummary);
    }
    
    // Initialize metrics
    await db.collection("users").doc(uid)
      .collection("metrics").doc("mood_history")
      .set({
        moods: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }
  
  // 2. Migrate journal entries
  const journalSnapshot = await db.collection("journalEntries").get();
  
  for (const entryDoc of journalSnapshot.docs) {
    const entryData = entryDoc.data();
    const userId = entryData.userId;
    
    if (!userId) continue;
    
    console.log(`Migrating journal entry: ${entryDoc.id} for user ${userId}`);
    
    // Copy to new location (remove userId field)
    const { userId: _, ...entryDataWithoutUserId } = entryData;
    
    await db.collection("users").doc(userId)
      .collection("journalEntries").doc(entryDoc.id)
      .set(entryDataWithoutUserId);
  }
  
  console.log("✅ Migration complete!");
}

migrateData().catch(console.error);
```

## Rollback Plan (If Needed)

To rollback to old structure:
1. Keep backup of old data (don't delete immediately)
2. Revert code changes in git
3. Re-deploy old version
4. Run reverse migration script if data was moved

## Notes

- **No migration needed for new projects** - Just use the new structure
- **Old data coexists** - Won't interfere with new structure
- **Categories remain global** - At root level for cross-user analytics
- **Metrics ready for expansion** - Currently just placeholder array

## Next Steps

1. Test signup flow with new user
2. Test journal creation/editing
3. Test AI session and summary storage
4. Verify dashboard displays data correctly
5. Monitor Firestore console for new structure
6. Delete old test data after verification

---

**Migration Completed:** October 26, 2025  
**Database Version:** v2.0 (Subcollection Architecture)
