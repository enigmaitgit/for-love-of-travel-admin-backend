# CMS Test Harness

This test harness validates the Content Management APIs of the Admin Panel backend using TypeScript, Vitest, Supertest, and Zod.

## Prerequisites

1. **MongoDB**: Ensure MongoDB is running locally or provide a test database URI
2. **Node.js**: Version 16 or higher
3. **Dependencies**: Install all dependencies with `npm install`

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up test environment** (optional):
   Create a `.env.test` file in the project root:
   ```env
   NODE_ENV=test
   TEST_DB_URI=mongodb://localhost:27017/love-of-travel-test
   JWT_SECRET=test-jwt-secret-key-for-testing-only
   PREVIEW_SECRET=test-preview-secret
   REVALIDATE_SECRET=test-revalidate-secret
   REVALIDATE_WEBHOOK_URL=https://example.com/revalidate
   ```

## Running Tests

### Run all CMS tests:
```bash
npm run test:cms
```

### Run specific test files:
```bash
# Posts API tests
npx vitest run tests/cms/posts.spec.ts

# Content Builder sections tests
npx vitest run tests/cms/sections.spec.ts

# Preview and publish tests
npx vitest run tests/cms/preview_publish.spec.ts

# RBAC tests
npx vitest run tests/cms/rbac.spec.ts

# Revalidation webhook tests
npx vitest run tests/cms/revalidate.spec.ts
```

### Run tests in watch mode:
```bash
npx vitest tests/cms --watch
```

## Test Coverage

The test harness covers the following CMS APIs:

### Admin (Protected) APIs:
- `POST /api/admin/posts` - Create posts
- `GET /api/admin/posts` - List posts with filtering/pagination
- `GET /api/admin/posts/:id` - Get post by ID
- `PATCH /api/admin/posts/:id` - Update post status
- `GET /api/admin/posts/:id/preview` - Get preview URL
- `POST /api/admin/content-page` - Save content page sections
- `PATCH /api/admin/content-page/publish` - Publish content page

### Public (Read-only) APIs:
- `GET /api/content-page?version=published` - Get published content page
- `GET /api/posts/:slug` - Get public post by slug

### Revalidation:
- `POST /api/revalidate` - Revalidate cached content

## Test Features

### ✅ **Validation Testing**
- Zod schema validation for all request/response data
- Exact error message matching (e.g., "Title is required", "Slug already exists")
- Input validation for all endpoints

### ✅ **RBAC Testing**
- Role-based access control for admin, editor, contributor, and anonymous users
- Permission-based endpoint access
- Proper error messages for unauthorized access

### ✅ **Content Builder Testing**
- Section validation (hero, text, image, gallery, breadcrumb, popular posts)
- Section order persistence
- Invalid section handling

### ✅ **Preview & Publish Testing**
- Signed preview URL generation
- Content page publishing with versioning
- Published snapshot isolation
- Webhook integration testing

### ✅ **Database Testing**
- Test database isolation
- Data cleanup between tests
- Factory functions for test data creation

## Test Structure

```
tests/cms/
├── setup.ts              # Test setup, database connection, auth helpers
├── contracts.ts          # Zod schemas for validation
├── posts.spec.ts         # Post CRUD and status management tests
├── sections.spec.ts      # Content builder section tests
├── preview_publish.spec.ts # Preview and publish functionality tests
├── rbac.spec.ts          # Role-based access control tests
├── revalidate.spec.ts    # Revalidation webhook tests
└── README.md            # This file
```

## Auth Helper

The `as(role)` helper provides authenticated requests for different user roles:

```typescript
// Anonymous access
await as('anonymous').get('/api/admin/posts');

// Contributor access
await as('contributor').post('/api/admin/posts').send(postData);

// Editor access
await as('editor').patch('/api/admin/content-page/publish');

// Admin access
await as('admin').get('/api/admin/posts');
```

## Expected Test Results

When running `npm run test:cms`, you should see:

- ✅ All validation tests passing
- ✅ All RBAC tests passing
- ✅ All content builder tests passing
- ✅ All preview/publish tests passing
- ✅ All revalidation tests passing

The test harness ensures that the CMS APIs meet the specified requirements and maintain data integrity, proper authorization, and correct error handling.
