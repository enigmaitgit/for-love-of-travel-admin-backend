import { describe, it, expect, beforeEach } from 'vitest';
import { as, seedPost } from './setup';
import { PostDraftSchema, PostPublishSchema, ApiResponseSchema, ErrorResponseSchema } from './contracts';

describe('CMS Posts API', () => {
  describe('POST /api/admin/posts', () => {
    it('should create a draft post successfully', async () => {
      const response = await as('contributor')
        .post('/api/admin/posts')
        .send({
          title: 'Test Post',
          slug: 'test-post',
          body: 'This is a test post body with enough content.',
          tags: ['test'],
          status: 'draft'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Draft saved');
      expect(response.body.data.title).toBe('Test Post');
      expect(response.body.data.status).toBe('draft');
      
      // Validate response structure
      const validation = ApiResponseSchema.safeParse(response.body);
      expect(validation.success).toBe(true);
    });

    it('should return 400 when title is missing', async () => {
      const response = await as('contributor')
        .post('/api/admin/posts')
        .send({
          slug: 'test-post',
          body: 'This is a test post body.',
          tags: ['test']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Title is required');
      
      const validation = ErrorResponseSchema.safeParse(response.body);
      expect(validation.success).toBe(true);
    });

    it('should return 409 when slug already exists', async () => {
      // Create first post
      await seedPost({ slug: 'existing-slug' });

      const response = await as('contributor')
        .post('/api/admin/posts')
        .send({
          title: 'Another Post',
          slug: 'existing-slug',
          body: 'This is another test post body.',
          tags: ['test']
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Slug already exists');
    });

    it('should save draft without body', async () => {
      const response = await as('contributor')
        .post('/api/admin/posts')
        .send({
          title: 'Draft Post',
          slug: 'draft-post',
          tags: ['draft']
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Draft saved');
    });
  });

  describe('PATCH /api/admin/posts/:id', () => {
    let postId: string;

    beforeEach(async () => {
      const post = await seedPost();
      postId = post._id.toString();
    });

    it('should publish post successfully', async () => {
      const response = await as('editor')
        .patch(`/api/admin/posts/${postId}`)
        .send({
          status: 'published',
          body: 'This is a complete post body with enough content for publishing.',
          tags: ['published', 'test']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Published');
      expect(response.body.data.status).toBe('published');
    });

    it('should return 400 when publishing without body', async () => {
      const response = await as('editor')
        .patch(`/api/admin/posts/${postId}`)
        .send({
          status: 'published',
          tags: ['test']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Body required for publishing');
    });

    it('should return 400 when publishing without tags', async () => {
      const response = await as('editor')
        .patch(`/api/admin/posts/${postId}`)
        .send({
          status: 'published',
          body: 'This is a complete post body with enough content for publishing.',
          tags: []
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Select at least one');
    });

    it('should return 400 when scheduling with past date', async () => {
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      
      const response = await as('editor')
        .patch(`/api/admin/posts/${postId}`)
        .send({
          status: 'scheduled',
          body: 'This is a complete post body with enough content for publishing.',
          tags: ['scheduled'],
          scheduledAt: pastDate.toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid date');
    });

    it('should schedule post with future date', async () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      
      const response = await as('editor')
        .patch(`/api/admin/posts/${postId}`)
        .send({
          status: 'scheduled',
          body: 'This is a complete post body with enough content for publishing.',
          tags: ['scheduled'],
          scheduledAt: futureDate.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Scheduled');
      expect(response.body.data.status).toBe('scheduled');
    });

    it('should send for review', async () => {
      const response = await as('contributor')
        .patch(`/api/admin/posts/${postId}`)
        .send({
          status: 'review',
          body: 'This is a complete post body with enough content for review.',
          tags: ['review']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Sent for review');
      expect(response.body.data.status).toBe('review');
    });
  });

  describe('GET /api/admin/posts', () => {
    beforeEach(async () => {
      // Create test posts
      await seedPost({ title: 'Draft Post', status: 'draft' });
      await seedPost({ title: 'Published Post', status: 'published' });
      await seedPost({ title: 'Review Post', status: 'review' });
    });

    it('should list posts with pagination', async () => {
      const response = await as('admin')
        .get('/api/admin/posts')
        .query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.rows).toHaveLength(2);
      expect(response.body.total).toBe(3);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(2);
    });

    it('should filter by status', async () => {
      const response = await as('admin')
        .get('/api/admin/posts')
        .query({ status: 'draft' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.rows).toHaveLength(1);
      expect(response.body.rows[0].status).toBe('draft');
    });

    it('should search posts', async () => {
      const response = await as('admin')
        .get('/api/admin/posts')
        .query({ search: 'Published' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.rows).toHaveLength(1);
      expect(response.body.rows[0].title).toBe('Published Post');
    });
  });

  describe('GET /api/admin/posts/:id', () => {
    it('should get post by id', async () => {
      const post = await seedPost({ title: 'Test Post' });
      
      const response = await as('admin')
        .get(`/api/admin/posts/${post._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Post');
    });

    it('should return 404 for non-existent post', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await as('admin')
        .get(`/api/admin/posts/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Post not found');
    });
  });
});
