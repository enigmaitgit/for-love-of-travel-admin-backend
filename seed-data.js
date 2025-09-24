const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Category = require('./src/models/Category');
const Post = require('./src/models/Post');
const Media = require('./src/models/Media');
const User = require('./src/models/User');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

// Sample data
const sampleCategories = [
  {
    name: 'Travel Destinations',
    slug: 'travel-destinations',
    description: 'Posts about amazing travel destinations around the world',
    color: '#3B82F6',
    icon: 'map-pin',
    isActive: true,
    sortOrder: 1
  },
  {
    name: 'Travel Tips',
    slug: 'travel-tips',
    description: 'Helpful tips and advice for travelers',
    color: '#10B981',
    icon: 'lightbulb',
    isActive: true,
    sortOrder: 2
  },
  {
    name: 'Food & Culture',
    slug: 'food-culture',
    description: 'Exploring local cuisine and cultural experiences',
    color: '#F59E0B',
    icon: 'utensils',
    isActive: true,
    sortOrder: 3
  },
  {
    name: 'Adventure Travel',
    slug: 'adventure-travel',
    description: 'Thrilling adventures and outdoor activities',
    color: '#EF4444',
    icon: 'mountain',
    isActive: true,
    sortOrder: 4
  }
];

const sampleMedia = [
  {
    filename: 'hero-mountain.jpg',
    originalName: 'mountain-hero.jpg',
    url: '/uploads/hero-mountain.jpg',
    type: 'image',
    mimeType: 'image/jpeg',
    size: 2048000,
    dimensions: { width: 1920, height: 1080 },
    alt: 'Beautiful mountain landscape',
    caption: 'Stunning mountain view for travel blog',
    tags: ['mountain', 'landscape', 'travel'],
    isPublic: true
  },
  {
    filename: 'beach-sunset.jpg',
    originalName: 'sunset-beach.jpg',
    url: '/uploads/beach-sunset.jpg',
    type: 'image',
    mimeType: 'image/jpeg',
    size: 1536000,
    dimensions: { width: 1600, height: 900 },
    alt: 'Sunset at the beach',
    caption: 'Peaceful beach sunset',
    tags: ['beach', 'sunset', 'peaceful'],
    isPublic: true
  }
];

const samplePosts = [
  {
    title: '10 Amazing Destinations You Must Visit in 2024',
    slug: '10-amazing-destinations-2024',
    body: 'Discover the most breathtaking destinations that should be on every traveler\'s bucket list for 2024. From hidden gems to iconic landmarks, these places offer unforgettable experiences.',
    excerpt: 'Explore the world\'s most incredible destinations for your next adventure.',
    contentSections: [
      {
        type: 'hero',
        data: {
          backgroundImage: '/uploads/hero-mountain.jpg',
          title: '10 Amazing Destinations You Must Visit in 2024',
          subtitle: 'Discover the world\'s most incredible places',
          author: 'Travel Expert',
          publishDate: '2024-01-15',
          readTime: '8 min read',
          overlayOpacity: 0.4,
          animation: {
            enabled: true,
            type: 'fadeIn',
            duration: 1.0
          }
        }
      },
      {
        type: 'text',
        data: {
          content: 'Travel opens our minds to new cultures, breathtaking landscapes, and unforgettable experiences. In this comprehensive guide, we\'ll take you through 10 destinations that should be at the top of your travel list for 2024.',
          fontSize: 'lg',
          alignment: 'left',
          animation: {
            enabled: true,
            type: 'slideUp',
            duration: 0.6
          }
        }
      },
      {
        type: 'image',
        data: {
          imageUrl: '/uploads/beach-sunset.jpg',
          altText: 'Beautiful beach sunset',
          caption: 'A peaceful sunset at one of our recommended destinations',
          alignment: 'center',
          rounded: true,
          shadow: true
        }
      }
    ],
    tags: ['destinations', 'travel', 'bucket-list', '2024'],
    status: 'published',
    seo: {
      metaTitle: '10 Amazing Destinations You Must Visit in 2024 | Travel Blog',
      metaDescription: 'Discover the most breathtaking destinations for 2024. From hidden gems to iconic landmarks, plan your next adventure with our expert recommendations.',
      jsonLd: true
    },
    breadcrumb: {
      enabled: true,
      items: [
        { label: 'Home', href: '/' },
        { label: 'Destinations', href: '/destinations' },
        { label: '2024 Guide', href: '/destinations/2024' }
      ]
    },
    isFeatured: true,
    readingTime: 8
  },
  {
    title: 'Essential Travel Tips for First-Time International Travelers',
    slug: 'essential-travel-tips-first-time',
    body: 'Traveling internationally for the first time can be overwhelming. Here are essential tips to help you prepare, stay safe, and make the most of your adventure.',
    excerpt: 'Everything you need to know before your first international trip.',
    contentSections: [
      {
        type: 'hero',
        data: {
          backgroundImage: '/uploads/beach-sunset.jpg',
          title: 'Essential Travel Tips for First-Time International Travelers',
          subtitle: 'Your complete guide to international travel',
          author: 'Travel Guide',
          publishDate: '2024-01-10',
          readTime: '6 min read',
          overlayOpacity: 0.3
        }
      },
      {
        type: 'text',
        data: {
          content: 'International travel can seem daunting, but with the right preparation, it becomes an exciting adventure. Here are the essential tips every first-time international traveler should know.',
          fontSize: 'base',
          alignment: 'left'
        }
      }
    ],
    tags: ['travel-tips', 'international', 'beginners', 'guide'],
    status: 'published',
    seo: {
      metaTitle: 'Essential Travel Tips for First-Time International Travelers',
      metaDescription: 'Complete guide with essential tips for first-time international travelers. Learn how to prepare, stay safe, and enjoy your trip.',
      jsonLd: false
    },
    breadcrumb: {
      enabled: true,
      items: [
        { label: 'Home', href: '/' },
        { label: 'Travel Tips', href: '/tips' }
      ]
    },
    isFeatured: false,
    readingTime: 6
  }
];

// Seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await Category.deleteMany({});
    await Post.deleteMany({});
    await Media.deleteMany({});
    console.log('🧹 Cleared existing data');

    // Create a sample user (you'll need to adjust this based on your User model)
    let sampleUser;
    try {
      sampleUser = await User.findOne({ email: 'admin@example.com' });
      if (!sampleUser) {
        sampleUser = await User.create({
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@example.com',
          password: 'password123', // This will be hashed by your User model
          role: 'admin'
        });
        console.log('👤 Created sample user');
      }
    } catch (error) {
      console.log('⚠️  Could not create user (check your User model):', error.message);
      // Create a mock user ID for posts
      sampleUser = { _id: new mongoose.Types.ObjectId() };
    }

    // Create categories
    const createdCategories = await Category.insertMany(sampleCategories);
    console.log(`📁 Created ${createdCategories.length} categories`);

    // Create media
    const createdMedia = await Media.insertMany(sampleMedia.map(media => ({
      ...media,
      uploadedBy: sampleUser._id
    })));
    console.log(`📸 Created ${createdMedia.length} media files`);

    // Create posts with category references
    const postsWithCategories = samplePosts.map(post => ({
      ...post,
      author: sampleUser._id,
      categories: [createdCategories[0]._id, createdCategories[1]._id], // Assign to first two categories
      publishedAt: new Date()
    }));

    const createdPosts = await Post.insertMany(postsWithCategories);
    console.log(`📝 Created ${createdPosts.length} posts`);

    // Update category post counts
    for (const category of createdCategories) {
      await category.updatePostCount();
    }
    console.log('📊 Updated category post counts');

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Categories: ${createdCategories.length}`);
    console.log(`- Media files: ${createdMedia.length}`);
    console.log(`- Posts: ${createdPosts.length}`);
    console.log('\n🎉 You can now view the data in MongoDB Compass!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the seeding
const runSeed = async () => {
  await connectDB();
  await seedDatabase();
};

runSeed();
