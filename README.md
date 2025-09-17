# ITC Vegas 2025 Conference App

An AI-powered conference companion app for ITC Vegas 2025 (October 15-17, 2025), featuring an intelligent agenda, speaker directory, and personalized scheduling.

## Features

- 📅 **Full Conference Agenda** - 295 sessions across 3 days
- 🎤 **Speaker Directory** - 181+ industry leaders with profiles
- 🤖 **AI Assistant** - Intelligent chat powered by Claude for conference navigation
- ⭐ **Favorites System** - Build your personalized schedule
- 🔐 **User Authentication** - Secure profile management
- 🔄 **Real-time Updates** - Live speaker profile fetching

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **AI Integration**: Anthropic Claude API

## Deployment to Vercel

### Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed (optional): `npm install -g vercel`

### Deployment Steps

#### Option 1: Deploy via GitHub (Recommended)

1. **Connect Repository**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Select `itc-conference-app` repository
   - Vercel will auto-detect the Next.js configuration

2. **Configure Environment Variables**
   - In your project settings on Vercel
   - Add these environment variables:
   ```
   DATABASE_URL=<your-postgresql-connection-string>
   NEXTAUTH_URL=https://your-app-name.vercel.app
   NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
   ANTHROPIC_API_KEY=<your-anthropic-api-key>
   OPENAI_API_KEY=<your-openai-api-key>
   PINECONE_API_KEY=<your-pinecone-api-key>
   PINECONE_ENVIRONMENT=<your-pinecone-environment>
   PINECONE_INDEX_NAME=<your-pinecone-index-name>
   FIRECRAWL_API_KEY=<your-firecrawl-key-if-needed>
   ```

3. **Deploy**
   - Vercel will automatically deploy on push to main branch
   - First deployment will build and start the app

#### Option 2: Deploy via CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel
   ```
   - Follow the prompts to link your project
   - Configure environment variables when prompted

### Post-Deployment

After deployment, you'll need to:

1. **Set up Database**
   - Use a PostgreSQL provider like Neon, Supabase, or Vercel Postgres
   - Run migrations: `npx prisma migrate deploy`
   - Run seed (optional): `npm run seed`

2. **Access Your App**
   - Your app will be available at: `https://your-app-name.vercel.app`

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_URL` | Your app's URL | Yes |
| `NEXTAUTH_SECRET` | Secret for NextAuth (generate with `openssl rand -base64 32`) | Yes |
| `ANTHROPIC_API_KEY` | Claude API key | Yes |
| `OPENAI_API_KEY` | OpenAI API key for embeddings | Yes |
| `PINECONE_API_KEY` | Pinecone API key for vector search | Optional |
| `PINECONE_ENVIRONMENT` | Pinecone environment | Optional |
| `PINECONE_INDEX_NAME` | Pinecone index name | Optional |
| `FIRECRAWL_API_KEY` | Firecrawl API key for web scraping | Optional |

## Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/adb1146/itc-conference-app.git
   cd itc-conference-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

4. **Set up database**
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run seed` - Seed database with conference data
- `npx prisma studio` - Open Prisma Studio for database management

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.