# Kivio 📺

Kivio is a high-performance, distraction-free YouTube feed aggregator designed for power users who want to take back control of their viewing experience.

## Why Kivio?

Traditional social platforms are designed to keep you scrolling through endless "recommended" loops. **Kivio** was created to break that cycle. 

The goal was to build a tool that:
- **Filters the Noise**: No distracting "up next" sidebars or comment sections.
- **Direct Content Access**: A pure, chronological feed of the creators YOU chose to follow.
- **Privacy First**: Maintain a separate "watch list" and subscription set away from your primary YouTube account.
- **Speed**: A lightning-fast, modern interface built on the latest web technologies.

## Features

- **Personalized Video Feed**: A unified, chronological dashboard of the latest uploads from your followed channels.
- **Channel Management**: Follow and unfollow YouTube channels using simple handles (e.g., `@handle`).
- **Private Watch History**: Track your recently viewed videos with a built-in history manager.
- **Smart Metadata Caching**: Optimized for performance with local database caching of channel statistics and thumbnails.
- **Auth Integration**: Secure login with Better Auth and Google OAuth support.
- **Modern Aesthetics**: A premium, responsive design with smooth animations and dark mode support.

## Tech Stack

- **Core Framework**: [TanStack Start](https://tanstack.com/start) (React 19 & TanStack Router)
- **Database**: [Neon](https://neon.tech/) (Serverless PostgreSQL)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Better Auth](https://www.better-auth.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Motion](https://motion.dev/)
- **Tooling**: [Biome](https://biomejs.dev/) for linting/formatting and [Vitest](https://vitest.dev/) for testing.

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/kirtanpatel01/kivio.git
   cd kivio
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up the database**:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## Deployment

Kivio is **currently deployed on Vercel** and uses **Nitro** as the server engine. 

To ensure stability and consistent routing, we **highly recommend** that you also deploy to Vercel. Using other platforms may require manual Nitro adapter configuration and may lead to SSR issues. To deploy successfully:

1.  **Framework Preset**: Select "TanStack Start" (or "Other" with Nitro detection) in your Vercel project settings.
2.  **Environment Variables**: Ensure you've set all the keys mentioned in the `.env` section below in your Vercel Dashboard.
3.  **Auth URL**: Set `BETTER_AUTH_URL` to your production domain.

## .env Example

Create a `.env` file in the root directory and add the following:

```env
# Database
NEON_DATABASE_URL=your_neon_db_url

# YouTube API
YOUTUBE_API_KEY=your_google_youtube_api_key

# Authentication (Better Auth)
BETTER_AUTH_SECRET=your_better_auth_secret
BETTER_AUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

*Build your own feed. Watch what you want.*
