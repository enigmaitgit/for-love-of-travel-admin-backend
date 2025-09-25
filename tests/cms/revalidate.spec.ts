import { describe, it, expect, beforeEach, vi } from 'vitest';
import { as } from './setup';
import { ApiResponseSchema, ErrorResponseSchema } from './contracts';

describe('CMS Revalidation Webhook', () => {
  describe('POST /api/revalidate', () => {
    it('should revalidate path with correct secret', async () => {
      const response = await as('anonymous')
        .post('/api/revalidate')
        .set('X-Revalidate-Secret', 'test-revalidate-secret')
        .send({ path: '/content-page' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Path revalidated successfully');
      expect(response.body.path).toBe('/content-page');

      // Validate response structure
      const validation = ApiResponseSchema.safeParse(response.body);
      expect(validation.success).toBe(true);
    });

    it('should return 401 with invalid secret', async () => {
      const response = await as('anonymous')
        .post('/api/revalidate')
        .set('X-Revalidate-Secret', 'wrong-secret')
        .send({ path: '/content-page' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid secret');

      const validation = ErrorResponseSchema.safeParse(response.body);
      expect(validation.success).toBe(true);
    });

    it('should return 401 without secret header', async () => {
      const response = await as('anonymous')
        .post('/api/revalidate')
        .send({ path: '/content-page' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid secret');
    });

    it('should handle missing path parameter', async () => {
      const response = await as('anonymous')
        .post('/api/revalidate')
        .set('X-Revalidate-Secret', 'test-revalidate-secret')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.path).toBe('/'); // Default path
    });

    it('should validate path parameter format', async () => {
      const response = await as('anonymous')
        .post('/api/revalidate')
        .set('X-Revalidate-Secret', 'test-revalidate-secret')
        .send({ path: 123 }); // Invalid path type

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid request');
    });
  });
});
