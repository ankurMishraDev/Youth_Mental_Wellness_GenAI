# Journal Feature Implementation Guide

## 🎉 What Has Been Created

### 1. Type Definitions (`lib/types/journal.ts`)
✅ Complete TypeScript interfaces for:
- Journal entries with rich text support
- Mood tracking (5 moods: very-sad to very-happy)
- Categories and daily prompts
- AI categorization
- Chat sessions for context
- Helper functions for mood conversion and text processing

### 2. Firebase Utilities
✅ **`lib/firebase/config.ts`** - Firebase client SDK initialization
✅ **`lib/firebase/journal.ts`** - CRUD operations for:
  - Journal entries (create, read, update, delete)
  - Categories (system + custom)
  - Daily prompts (weighted random selection)
✅ **`lib/firebase/storage.ts`** - Image upload/delete to Firebase Storage
✅ **`lib/firebase/categorize.ts`** - AI-powered entry categorization

### 3. API Routes
✅ **`/api/journal`** - GET (list), POST (create)
✅ **`/api/journal/[id]`** - GET, PUT, DELETE single entry
✅ **`/api/categorize`** - POST to categorize using Vertex AI
✅ **`/api/prompts`** - GET random daily prompts
✅ **`/api/upload-image`** - Image upload endpoint (placeholder)

### 4. AI Integration
✅ **`lib/genai.ts`** - Vertex AI (Gemini) wrapper for:
  - Content generation
  - Structured JSON responses
  - Categorization logic

### 5. UI Components (`components/journal/`)
✅ **MoodSelector** - Interactive mood picker with emojis
✅ **RichTextEditor** - Simple rich text editor (expandable later)
✅ **ImageUploader** - Multi-image upload with captions
✅ **JournalEntryForm** - Complete create/edit form
✅ **JournalEntryCard** - Entry preview for list view

---

## 📋 Next Steps: Completing the Feature

### Step 1: Install Required Dependencies

Run this in your project root:

\`\`\`bash
npm install firebase lucide-react @google/generative-ai
\`\`\`

### Step 2: Configure Environment Variables

Add to your `.env.local`:

\`\`\`env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Vertex AI / Gemini API Key
GEMINI_API_KEY=your_gemini_api_key
\`\`\`

### Step 3: Set Up Firestore Security Rules

In your Firebase Console, add these security rules:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Journal Entries - Private to user
    match /journalEntries/{entryId} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null 
                    && request.auth.uid == request.resource.data.userId;
    }
    
    // Categories - Read by all authenticated users
    match /categories/{categoryId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && (resource == null || resource.data.userId == null 
                       || resource.data.userId == request.auth.uid);
    }
    
    // Daily Prompts - Read-only for users
    match /dailyPrompts/{promptId} {
      allow read: if request.auth != null && resource.data.active == true;
      allow write: if false; // Admin only
    }
  }
}
\`\`\`

### Step 4: Set Up Firebase Storage Rules

\`\`\`javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /journal-images/{userId}/{imageId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024; // 5MB limit
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
  }
}
\`\`\`

### Step 5: Create Journal Pages

You need to create these page files:

#### **`app/journal/page.tsx`** - Journal List Page
\`\`\`typescript
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JournalEntryCard } from '@/components/journal/JournalEntryCard';
import { PlusCircle, Loader2 } from 'lucide-react';
import type { JournalEntry } from '@/lib/types/journal';

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    try {
      // Get userId from your auth context/session
      const userId = 'YOUR_USER_ID'; // TODO: Get from auth
      
      const response = await fetch('/api/journal', {
        headers: {
          'x-user-id': userId,
        },
      });

      const data = await response.json();
      setEntries(data.entries);
    } catch (error) {
      console.error('Failed to fetch entries:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Journal</h1>
        <button
          onClick={() => router.push('/journal/new')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          <PlusCircle size={20} />
          New Entry
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={40} className="animate-spin text-gray-400" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No journal entries yet</p>
          <button
            onClick={() => router.push('/journal/new')}
            className="text-blue-600 hover:underline"
          >
            Create your first entry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <JournalEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
\`\`\`

#### **`app/journal/new/page.tsx`** - Create New Entry
\`\`\`typescript
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { JournalEntryForm } from '@/components/journal/JournalEntryForm';
import type { CreateJournalEntryInput } from '@/lib/types/journal';

export default function NewJournalEntryPage() {
  const router = useRouter();

  async function handleSubmit(data: CreateJournalEntryInput) {
    // Get userId from your auth context
    const userId = 'YOUR_USER_ID'; // TODO: Get from auth

    const response = await fetch('/api/journal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        ...data,
        autoCategorize: true, // Enable AI categorization
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create entry');
    }

    // Redirect to journal list
    router.push('/journal');
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">New Journal Entry</h1>
      <JournalEntryForm
        userId="YOUR_USER_ID" // TODO: Get from auth
        onSubmit={handleSubmit}
        onCancel={() => router.push('/journal')}
      />
    </div>
  );
}
\`\`\`

### Step 6: Integrate with Dashboard

Add a journal section to your existing Dashboard component:

\`\`\`typescript
// In components/Dashboard.tsx
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

// Add this to your dashboard
<Link
  href="/journal"
  className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100"
>
  <BookOpen size={24} className="text-blue-600" />
  <div>
    <h3 className="font-semibold">Journal</h3>
    <p className="text-sm text-gray-600">Write your thoughts</p>
  </div>
</Link>
\`\`\`

### Step 7: Update `db-server.js` for Context

Add this endpoint to your `scripts/db-server.js`:

\`\`\`javascript
app.post("/get-user-context", async (req, res) => {
  const { uid } = req.body;
  
  if (!uid) {
    return res.status(400).send({ error: "Missing uid" });
  }

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).send({ error: "User not found" });
    }

    const userData = userDoc.data();
    
    // Fetch recent journal entries (last 30 days)
    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    
    const journalSnapshot = await db
      .collection("journalEntries")
      .where("userId", "==", uid)
      .where("createdAt", ">=", thirtyDaysAgo)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const journalSummaries = journalSnapshot.docs.map(doc => {
      const data = doc.data();
      const content = data.content
        ?.map(block => block.children?.map(child => child.text).join(' '))
        .join(' ')
        .substring(0, 200);
      
      return {
        date: data.createdAt?.toDate()?.toLocaleDateString(),
        mood: data.mood,
        summary: content,
      };
    });

    res.status(200).send({
      userData,
      journalEntriesCount: journalSnapshot.size,
      journalSummaries,
    });
    
  } catch (error) {
    console.error("Context retrieval error:", error);
    res.status(500).send({ error: error.message });
  }
});
\`\`\`

### Step 8: Seed Initial Data (Optional)

Create some default categories and prompts in Firestore manually or via script:

**Default Categories:**
- Anxiety & Stress (#ef4444)
- Joy & Gratitude (#eab308)
- Reflection (#6b7280)
- Relationships (#ec4899)
- Personal Growth (#22c55e)

**Sample Daily Prompts:**
- "What made you smile today?"
- "What's on your mind right now?"
- "Describe a challenge you're facing"
- "What are you grateful for?"

---

## 🧪 Testing the Feature

1. **Start your development server:**
   \`\`\`bash
   npm run dev
   \`\`\`

2. **Navigate to** `/journal/new`

3. **Create a test entry:**
   - Select a mood
   - Write some content
   - Upload an image (optional)
   - Submit

4. **Check Firestore Console** to see:
   - Journal entry created
   - Auto-categorization applied
   - Images uploaded to Storage

5. **Test AI categorization** by creating entries with different themes

---

## 🚀 Future Enhancements

- [ ] Rich text formatting (bold, italic, lists)
- [ ] Entry search and filtering
- [ ] Mood analytics and charts
- [ ] Export journal to PDF
- [ ] Voice-to-text entry creation
- [ ] Daily reminder notifications
- [ ] Sharing entries (with permission)
- [ ] Journal templates
- [ ] Tagging system

---

## 🐛 Troubleshooting

**Issue: "Firebase is not defined"**
- Ensure you've installed: `npm install firebase`
- Check that environment variables are set

**Issue: "Failed to categorize"**
- Verify GEMINI_API_KEY is set
- Check API quota limits
- Fallback to "Uncategorized" is automatic

**Issue: "Image upload failed"**
- Check Firebase Storage rules
- Verify file size < 5MB
- Ensure user is authenticated

---

## 📚 Documentation References

- [Firebase Web SDK](https://firebase.google.com/docs/web/setup)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Storage](https://firebase.google.com/docs/storage)
- [Vertex AI Gemini](https://cloud.google.com/vertex-ai/docs/generative-ai/start/quickstarts/quickstart-multimodal)

---

**Status: Core infrastructure complete ✅**
**Next: Create page components and integrate with auth**
