import { describe, it, expect, beforeEach, vi } from 'vitest';
import { as, seedPost, seedSections } from './setup';
import { PreviewResponseSchema, ApiResponseSchema } from './contracts';

// Mock fetch for webhook testing
global.fetch = vi.fn();

describe('CMS Preview and Publish', () => {
  describe('GET /api/admin/posts/:id/preview', () => {
    it('should return preview URL for post', async () => {
      const post = await seedPost({ title: 'Test Post' });

      const response = await as('admin')
        .get(`/api/admin/posts/${post._id}/preview`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.previewUrl).toBeDefined();
      expect(response.body.previewUrl).toMatch(/^\/preview\//);
      expect(response.body.previewUrl).toContain('?t=');
      expect(response.body.previewUrl).toContain('&h=');

      // Validate response structure
      const validation = PreviewResponseSchema.safeParse(response.body);
      expect(validation.success).toBe(true);
    });

    it('should return 404 for non-existent post', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await as('admin')
        .get(`/api/admin/posts/${fakeId}/preview`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Post not found');
    });

    it('should generate different preview URLs for same post', async () => {
      const post = await seedPost({ title: 'Test Post' });

      const response1 = await as('admin')
        .get(`/api/admin/posts/${post._id}/preview`);

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const response2 = await as('admin')
        .get(`/api/admin/posts/${post._id}/preview`);

      expect(response1.body.previewUrl).not.toBe(response2.body.previewUrl);
    });
  });

  describe('PATCH /api/admin/content-page/publish', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should publish content page successfully', async () => {
      // Create draft content page
      await seedSections({
        status: 'draft',
        sections: [
          {
            type: 'hero',
            props: {
              imageUrl: 'https://example.com/hero.jpg',
              title: 'Published Hero',
              subtitle: 'This is now published'
            }
          }
        ],
        version: 1
      });

      const response = await as('editor')
        .patch('/api/admin/content-page/publish');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Content page published');
      expect(response.body.data.status).toBe('published');
      expect(response.body.data.publishedAt).toBeDefined();
      expect(response.body.data.version).toBe(2);

      // Validate response structure
      const validation = ApiResponseSchema.safeParse(response.body);
      expect(validation.success).toBe(true);
    });

    it('should increment version on publish', async () => {
      // Create content page with version 3
      await seedSections({
        status: 'draft',
        version: 3
      });

      const response = await as('editor')
        .patch('/api/admin/content-page/publish');

      expect(response.status).toBe(200);
      expect(response.body.data.version).toBe(4);
    });

    it('should set publishedAt timestamp', async () => {
      await seedSections({ status: 'draft' });

      const beforePublish = new Date();
      
      const response = await as('editor')
        .patch('/api/admin/content-page/publish');

      const afterPublish = new Date();
      const publishedAt = new Date(response.body.data.publishedAt);

      expect(publishedAt.getTime()).toBeGreaterThanOrEqual(beforePublish.getTime());
      expect(publishedAt.getTime()).toBeLessThanOrEqual(afterPublish.getTime());
    });

    it('should return 404 when content page does not exist', async () => {
      const response = await as('editor')
        .patch('/api/admin/content-page/publish');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Content page not found');
    });

    it('should call revalidation webhook when configured', async () => {
      // Mock environment variables
      const originalWebhookUrl = process.env.REVALIDATE_WEBHOOK_URL;
      const originalSecret = process.env.REVALIDATE_SECRET;
      
      process.env.REVALIDATE_WEBHOOK_URL = 'https://example.com/revalidate';
      process.env.REVALIDATE_SECRET = 'test-secret';

      // Mock successful fetch response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      await seedSections({ status: 'draft' });

      const response = await as('editor')
        .patch('/api/admin/content-page/publish');

      expect(response.status).toBe(200);

      // Verify webhook was called
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/revalidate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Revalidate-Secret': 'test-secret'
          },
          body: JSON.stringify({ path: '/content-page' })
        }
      );

      // Restore environment variables
      process.env.REVALIDATE_WEBHOOK_URL = originalWebhookUrl;
      process.env.REVALIDATE_SECRET = originalSecret;
    });

    it('should handle webhook failure gracefully', async () => {
      // Mock environment variables
      const originalWebhookUrl = process.env.REVALIDATE_WEBHOOK_URL;
      
      process.env.REVALIDATE_WEBHOOK_URL = 'https://example.com/revalidate';

      // Mock failed fetch response
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await seedSections({ status: 'draft' });

      const response = await as('editor')
        .patch('/api/admin/content-page/publish');

      // Should still succeed even if webhook fails
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Restore environment variables
      process.env.REVALIDATE_WEBHOOK_URL = originalWebhookUrl;
    });
  });

  describe('Content Page Snapshot Behavior', () => {
    it('should maintain published snapshot after further edits', async () => {
      // Create and publish initial version
      await seedSections({
        status: 'draft',
        sections: [
          {
            type: 'hero',
            props: {
              imageUrl: 'https://example.com/hero1.jpg',
              title: 'Original Title'
            }
          }
        ]
      });

      // Publish
      await as('editor').patch('/api/admin/content-page/publish');

      // Make further edits to draft
      await as('editor')
        .post('/api/admin/content-page')
        .send({
          sections: [
            {
              type: 'hero',
              props: {
                imageUrl: 'https://example.com/hero2.jpg',
                title: 'Modified Title'
              }
            }
          ]
        });

      // Public endpoint should still return original published version
      const publicResponse = await as('anonymous')
        .get('/api/content-page')
        .query({ version: 'published' });

      expect(publicResponse.status).toBe(200);
      expect(publicResponse.body.data.sections[0].props.title).toBe('Original Title');
      expect(publicResponse.body.data.sections[0].props.imageUrl).toBe('https://example.com/hero1.jpg');
    });
  });
});
