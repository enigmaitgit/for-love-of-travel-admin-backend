# Love of Travel Backend API

A comprehensive Node.js + Express + MongoDB backend API for the Love of Travel admin panel.

## 🚀 Features

- **Content Management**: Full CRUD operations for blog posts
- **User Management**: Role-based access control (Admin, Editor, Contributor)
- **Comment System**: Comment moderation and approval workflow
- **Media Management**: File upload and management system
- **Authentication**: JWT-based authentication with role permissions
- **API Documentation**: RESTful API with comprehensive endpoints
- **Security**: Rate limiting, CORS, helmet, input validation
- **Database**: MongoDB with Mongoose ODM

## 📋 Prerequisites

- Node.js 16.x or higher
- MongoDB 4.4 or higher
- npm or yarn

## 🛠️ Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp env.example .env
   ```

4. **Configure environment variables**
   Edit `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/love-of-travel

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d

   # CORS Configuration
   FRONTEND_URL=http://localhost:3000
   ```

5. **Start MongoDB**
   Make sure MongoDB is running on your system.

6. **Run the application**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user
- `PUT /api/v1/auth/profile` - Update user profile
- `PUT /api/v1/auth/change-password` - Change password
- `POST /api/v1/auth/logout` - Logout user

### Posts
- `GET /api/v1/posts` - Get all posts (with filtering)
- `GET /api/v1/posts/:id` - Get single post
- `POST /api/v1/posts` - Create new post
- `PUT /api/v1/posts/:id` - Update post
- `DELETE /api/v1/posts/:id` - Delete post
- `PATCH /api/v1/posts/bulk` - Bulk operations

### Users
- `GET /api/v1/users` - Get all users (Admin/Editor)
- `GET /api/v1/users/:id` - Get single user
- `POST /api/v1/users` - Create new user (Admin)
- `PUT /api/v1/users/:id` - Update user (Admin)
- `DELETE /api/v1/users/:id` - Delete user (Admin)

### Comments
- `GET /api/v1/comments` - Get all comments (Editor+)
- `GET /api/v1/comments/post/:postId` - Get comments for post
- `POST /api/v1/comments` - Create new comment
- `PATCH /api/v1/comments/:id/status` - Update comment status
- `DELETE /api/v1/comments/:id` - Delete comment (Admin)
- `PATCH /api/v1/comments/bulk` - Bulk operations

### Media
- `GET /api/v1/media` - Get all media files
- `GET /api/v1/media/:id` - Get single media file
- `POST /api/v1/media/upload` - Upload media file
- `PUT /api/v1/media/:id` - Update media metadata
- `DELETE /api/v1/media/:id` - Delete media file
- `GET /api/v1/media/serve/:filename` - Serve media files

## 🔐 Authentication & Authorization

### User Roles
- **Admin**: Full access to all features
- **Editor**: Can manage posts, comments, and media
- **Contributor**: Can create and edit own posts

### Permissions
- `post:create` - Create new posts
- `post:edit` - Edit posts
- `post:publish` - Publish posts
- `post:delete` - Delete posts
- `post:review` - Review posts
- `post:schedule` - Schedule posts
- `user:create` - Create users (Admin only)
- `user:edit` - Edit users (Admin only)
- `user:delete` - Delete users (Admin only)
- `media:upload` - Upload media files
- `media:delete` - Delete media files
- `media:view` - View media files

## 🗄️ Database Models

### Post Model
- Title, slug, body, excerpt
- Featured image, tags, categories
- Status (draft, review, scheduled, published, archived)
- Author, publication dates
- SEO metadata, statistics
- Reading time calculation

### User Model
- Personal information (name, email, avatar)
- Role-based permissions
- Social links, bio
- Account status and verification

### Comment Model
- Post reference, author information
- Content, rating, status
- Replies, moderation tracking
- IP address and user agent

### Media Model
- File information (name, type, size)
- Metadata (alt text, caption, tags)
- Usage tracking, dimensions
- Upload tracking

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## 🔧 Configuration

### Environment Variables
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRE` - JWT expiration time
- `FRONTEND_URL` - Frontend URL for CORS

### File Upload
- Maximum file size: 10MB
- Allowed types: Images, videos, documents
- Storage: Local filesystem (configurable for cloud storage)

## 🚀 Deployment

1. **Set production environment variables**
2. **Build the application**
3. **Start MongoDB service**
4. **Run the application**

```bash
NODE_ENV=production npm start
```

## 📖 API Documentation

Visit `http://localhost:5000/api/v1` for API overview and available endpoints.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please contact the development team.
