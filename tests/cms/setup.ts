import { describe, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
process.env.PREVIEW_SECRET = process.env.PREVIEW_SECRET || 'test-preview-secret';
process.env.REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || 'test-revalidate-secret';

import app from '../../src/server.js';
import User from '../../src/models/User.js';
import Post from '../../src/models/Post.js';
import ContentPage from '../../src/models/ContentPage.js';

// Test database setup
const TEST_DB_URI = process.env.TEST_DB_URI || 'mongodb://localhost:27017/love-of-travel-test';

// Test data factories
export const seedPost = async (overrides: any = {}) => {
  const defaultPost = {
    title: 'Test Post',
    slug: 'test-post',
    body: 'This is a test post body with enough content to meet the minimum requirements.',
    tags: ['test', 'example'],
    categories: [],
    status: 'draft',
    author: new mongoose.Types.ObjectId(),
    ...overrides
  };
  
  return await Post.create(defaultPost);
};

export const seedSections = async (overrides: any = {}) => {
  const defaultSections = {
    slug: 'content',
    status: 'draft',
    sections: [
      {
        type: 'hero',
        props: {
          imageUrl: 'https://example.com/hero.jpg',
          title: 'Test Hero',
          subtitle: 'Test subtitle'
        }
      }
    ],
    seo: {
      title: 'Test Page',
      description: 'Test description'
    },
    version: 1,
    ...overrides
  };
  
  return await ContentPage.create(defaultSections);
};

// Auth helper
export const as = (role: 'admin' | 'editor' | 'contributor' | 'anonymous') => {
  const agent = request(app);
  
  if (role === 'anonymous') {
    return agent;
  }
  
  // Create a test user with the specified role
  const testUser = {
    _id: new mongoose.Types.ObjectId(),
    firstName: 'Test',
    lastName: 'User',
    email: `test-${role}@example.com`,
    role,
    isActive: true,
    can: (action: string) => {
      const permissions = {
        admin: [
          'post:create', 'post:edit', 'post:publish', 'post:delete', 'post:review', 'post:schedule', 'post:view',
          'user:create', 'user:edit', 'user:delete', 'user:view',
          'media:upload', 'media:delete', 'media:view',
          'analytics:view', 'settings:edit'
        ],
        editor: [
          'post:create', 'post:edit', 'post:publish', 'post:delete', 'post:review', 'post:schedule', 'post:view',
          'user:view',
          'media:upload', 'media:view',
          'analytics:view'
        ],
        contributor: [
          'post:create', 'post:edit', 'post:view',
          'media:upload', 'media:view'
        ]
      };
      return permissions[role]?.includes(action) || false;
    }
  };
  
  const token = jwt.sign(
    { id: testUser._id },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
  
  return agent.set('Authorization', `Bearer ${token}`);
};

// Database setup
beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  // Clean up test data before each test
  await Post.deleteMany({});
  await ContentPage.deleteMany({});
  await User.deleteMany({});
});

afterEach(async () => {
  // Clean up test data after each test
  await Post.deleteMany({});
  await ContentPage.deleteMany({});
  await User.deleteMany({});
});

export { app };
