import { z } from 'zod';

// Posts
export const PostStatus = z.enum(['draft', 'review', 'scheduled', 'published']);

export const PostDraftSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be URL-safe'),
  body: z.string().optional(),
  tags: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  featuredImage: z.string().url().optional(),
  status: z.literal('draft').optional()
});

export const PostPublishSchema = PostDraftSchema.extend({
  status: z.enum(['review', 'scheduled', 'published']),
  body: z.string().min(1, 'Body required for publishing'),
  tags: z.array(z.string()).min(1, 'Select at least one'),
  scheduledAt: z.coerce.date().optional()
}).refine(
  (v) => v.status !== 'scheduled' || (v.scheduledAt && v.scheduledAt.getTime() > Date.now()),
  { message: 'Invalid date', path: ['scheduledAt'] }
);

// Content Builder sections
const Hero = z.object({ 
  type: z.literal('hero'), 
  props: z.object({
    imageUrl: z.string().url(), 
    title: z.string(), 
    subtitle: z.string().optional(),
    overlay: z.boolean().optional(), 
    cta: z.object({
      label: z.string(), 
      href: z.string().url()
    }).optional()
  })
});

const Breadcrumb = z.object({ 
  type: z.literal('breadcrumb'), 
  props: z.object({
    items: z.array(z.object({
      label: z.string(), 
      href: z.string()
    })).min(1)
  })
});

const Text = z.object({ 
  type: z.literal('text'), 
  props: z.object({
    html: z.string().optional(), 
    markdown: z.string().optional()
  }).refine(p => !!p.html || !!p.markdown, { message: 'Provide html or markdown' })
});

const SingleImage = z.object({ 
  type: z.literal('singleImage'), 
  props: z.object({
    url: z.string().url(), 
    caption: z.string().optional(), 
    alt: z.string().optional()
  })
});

const ImageGallery = z.object({ 
  type: z.literal('imageGallery'), 
  props: z.object({
    images: z.array(z.object({ 
      url: z.string().url(), 
      alt: z.string().optional(), 
      caption: z.string().optional()
    })).min(1),
    layout: z.enum(['grid', 'masonry']).optional()
  })
});

const PopularPosts = z.object({ 
  type: z.literal('popularPosts'), 
  props: z.object({
    postIds: z.array(z.string()).min(1), 
    layout: z.enum(['grid', 'list']).optional()
  })
});

export const SectionUnion = z.union([Hero, Breadcrumb, Text, SingleImage, ImageGallery, PopularPosts]);

export const ContentPageDoc = z.object({
  slug: z.literal('content'),
  status: z.enum(['draft', 'review', 'scheduled', 'published']),
  sections: z.array(SectionUnion),
  seo: z.object({ 
    title: z.string().optional(), 
    description: z.string().optional() 
  }).optional(),
  version: z.number().int().nonnegative().optional(),
  publishedAt: z.string().datetime().optional()
});

// API Response schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
  rows: z.array(z.any()).optional(),
  total: z.number().optional(),
  page: z.number().optional(),
  limit: z.number().optional()
});

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string()
});

// Preview response schema
export const PreviewResponseSchema = z.object({
  success: z.boolean(),
  previewUrl: z.string()
});
