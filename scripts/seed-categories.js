/**
 * Seed Default Categories Script
 * Run once to populate default categories in Firestore
 * 
 * Usage: node scripts/seed-categories.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const DEFAULT_CATEGORIES = [
  {
    title: 'Wellness',
    description: 'Physical and mental self-care, exercise, sleep, and healthy habits',
    color: '#10b981', // green
    userId: null,
    isDefault: true,
  },
  {
    title: 'Relationships',
    description: 'Friendships, social connections, conflicts, and meaningful interactions',
    color: '#ec4899', // pink
    userId: null,
    isDefault: true,
  },
  {
    title: 'School',
    description: 'Academic life, classes, homework, exams, and learning experiences',
    color: '#3b82f6', // blue
    userId: null,
    isDefault: true,
  },
  {
    title: 'Family',
    description: 'Family relationships, home life, and family activities',
    color: '#f59e0b', // amber
    userId: null,
    isDefault: true,
  },
  {
    title: 'Personal Growth',
    description: 'Self-improvement, new skills, challenges, and personal development',
    color: '#8b5cf6', // violet
    userId: null,
    isDefault: true,
  },
  {
    title: 'Hobbies & Interests',
    description: 'Creative activities, hobbies, passions, and things you enjoy',
    color: '#06b6d4', // cyan
    userId: null,
    isDefault: true,
  },
  {
    title: 'Mental Health',
    description: 'Emotions, anxiety, stress, coping strategies, and mental wellbeing',
    color: '#9333ea', // purple
    userId: null,
    isDefault: true,
  },
  {
    title: 'Goals & Dreams',
    description: 'Future plans, aspirations, achievements, and things you want to accomplish',
    color: '#ef4444', // red
    userId: null,
    isDefault: true,
  },
  {
    title: 'Daily Reflections',
    description: 'Everyday thoughts, gratitude, observations, and general life updates',
    color: '#6b7280', // gray
    userId: null,
    isDefault: true,
  }
];

async function seedCategories() {
  console.log('🌱 Starting categories seed...');

  try {
    // Seed all default categories (no check for existing)
    console.log('Creating 9 default categories...\n');
    
    for (const category of DEFAULT_CATEGORIES) {
      const docRef = await db.collection('categories').add({
        ...category,
        createdAt: new Date().toISOString()
      });
      console.log(`✓ Created: ${category.title} (ID: ${docRef.id})`);
    }

    console.log(`\n✅ Successfully seeded ${DEFAULT_CATEGORIES.length} default categories!`);

  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  } finally {
    // Clean up
    await admin.app().delete();
  }
}

// Run the seed
seedCategories()
  .then(() => {
    console.log('🎉 Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed failed:', error);
    process.exit(1);
  });
