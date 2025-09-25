import { describe, it, expect, beforeEach } from 'vitest';
import { as, seedSections } from './setup';
import { ContentPageDoc, ApiResponseSchema, ErrorResponseSchema } from './contracts';

describe('CMS Content Builder Sections', () => {
  describe('POST /api/admin/content-page', () => {
    it('should save content page sections successfully', async () => {
      const sections = [
        {
          type: 'hero',
          props: {
            imageUrl: 'https://example.com/hero.jpg',
            title: 'Welcome to Our Site',
            subtitle: 'Discover amazing content',
            overlay: true,
            cta: {
              label: 'Get Started',
              href: 'https://example.com/start'
            }
          }
        },
        {
          type: 'text',
          props: {
            html: '<p>This is some content</p>',
            markdown: '# Heading\n\nSome text'
          }
        },
        {
          type: 'singleImage',
          props: {
            url: 'https://example.com/image.jpg',
            caption: 'A beautiful image',
            alt: 'Description'
          }
        }
      ];

      const response = await as('editor')
        .post('/api/admin/content-page')
        .send({
          sections,
          seo: {
            title: 'Home Page',
            description: 'Welcome to our website'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Content page saved');
      expect(response.body.data.sections).toHaveLength(3);
      expect(response.body.data.sections[0].type).toBe('hero');
      expect(response.body.data.sections[1].type).toBe('text');
      expect(response.body.data.sections[2].type).toBe('singleImage');

      // Validate response structure
      const validation = ApiResponseSchema.safeParse(response.body);
      expect(validation.success).toBe(true);
    });

    it('should persist section order exactly', async () => {
      const sections = [
        { type: 'text', props: { html: 'First section' } },
        { type: 'singleImage', props: { url: 'https://example.com/1.jpg' } },
        { type: 'text', props: { html: 'Second section' } },
        { type: 'singleImage', props: { url: 'https://example.com/2.jpg' } }
      ];

      const response = await as('editor')
        .post('/api/admin/content-page')
        .send({ sections });

      expect(response.status).toBe(200);
      expect(response.body.data.sections).toHaveLength(4);
      expect(response.body.data.sections[0].type).toBe('text');
      expect(response.body.data.sections[1].type).toBe('singleImage');
      expect(response.body.data.sections[2].type).toBe('text');
      expect(response.body.data.sections[3].type).toBe('singleImage');
    });

    it('should return 400 for invalid section (empty gallery)', async () => {
      const sections = [
        {
          type: 'imageGallery',
          props: {
            images: [], // Empty images array
            layout: 'grid'
          }
        }
      ];

      const response = await as('editor')
        .post('/api/admin/content-page')
        .send({ sections });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Gallery must have at least one image');
    });

    it('should validate image gallery with images', async () => {
      const sections = [
        {
          type: 'imageGallery',
          props: {
            images: [
              { url: 'https://example.com/1.jpg', alt: 'Image 1' },
              { url: 'https://example.com/2.jpg', alt: 'Image 2' }
            ],
            layout: 'masonry'
          }
        }
      ];

      const response = await as('editor')
        .post('/api/admin/content-page')
        .send({ sections });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sections[0].props.images).toHaveLength(2);
    });

    it('should validate breadcrumb section', async () => {
      const sections = [
        {
          type: 'breadcrumb',
          props: {
            items: [
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: 'Current Page', href: '/blog/current' }
            ]
          }
        }
      ];

      const response = await as('editor')
        .post('/api/admin/content-page')
        .send({ sections });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sections[0].props.items).toHaveLength(3);
    });

    it('should validate popular posts section', async () => {
      const sections = [
        {
          type: 'popularPosts',
          props: {
            postIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
            layout: 'list'
          }
        }
      ];

      const response = await as('editor')
        .post('/api/admin/content-page')
        .send({ sections });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sections[0].props.postIds).toHaveLength(2);
    });
  });

  describe('GET /api/admin/content-page', () => {
    it('should get content page', async () => {
      await seedSections();

      const response = await as('admin')
        .get('/api/admin/content-page');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.slug).toBe('content');
      expect(response.body.data.sections).toBeDefined();
    });

    it('should return 404 when content page does not exist', async () => {
      const response = await as('admin')
        .get('/api/admin/content-page');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Content page not found');
    });
  });

  describe('GET /api/content-page (Public)', () => {
    it('should return 404 when no published version exists', async () => {
      // Create draft version only
      await seedSections({ status: 'draft' });

      const response = await as('anonymous')
        .get('/api/content-page')
        .query({ version: 'published' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Content page not found');
    });

    it('should return published content page', async () => {
      // Create published version
      await seedSections({ 
        status: 'published',
        publishedAt: new Date().toISOString(),
        version: 2
      });

      const response = await as('anonymous')
        .get('/api/content-page')
        .query({ version: 'published' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('published');
      expect(response.body.data.publishedAt).toBeDefined();
    });
  });

  describe('GET /api/posts/:slug (Public)', () => {
    it('should return published post by slug', async () => {
      const post = await seedPost({
        slug: 'test-article',
        status: 'published',
        title: 'Test Article',
        body: 'This is a published article with enough content.'
      });

      const response = await as('anonymous')
        .get('/api/posts/test-article');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Article');
      expect(response.body.data.status).toBe('published');
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await as('anonymous')
        .get('/api/posts/non-existent-slug');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Post not found');
    });

    it('should return 404 for draft post', async () => {
      await seedPost({
        slug: 'draft-article',
        status: 'draft',
        title: 'Draft Article'
      });

      const response = await as('anonymous')
        .get('/api/posts/draft-article');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Post not found');
    });
  });
});
