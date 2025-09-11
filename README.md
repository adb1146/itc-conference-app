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

## Deployment to Railway

### Prerequisites

1. A Railway account (sign up at https://railway.app)
2. Railway CLI installed (optional): `npm install -g @railway/cli`

### Deployment Steps

#### Option 1: Deploy via GitHub (Recommended)

1. **Connect Repository**
   - Go to https://railway.app/new
   - Choose "Deploy from GitHub repo"
   - Select `itc-conference-app` repository
   - Railway will auto-detect the configuration

2. **Add PostgreSQL Database**
   - In your Railway project, click "New Service"
   - Select "Database" → "Add PostgreSQL"
   - Railway will automatically add the DATABASE_URL

3. **Configure Environment Variables**
   - Go to your service settings
   - Add these environment variables:
   ```
   NEXTAUTH_URL=https://your-app-name.railway.app
   NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
   ANTHROPIC_API_KEY=<your-anthropic-api-key>
   FIRECRAWL_API_KEY=<your-firecrawl-key-if-needed>
   ```

4. **Deploy**
   - Railway will automatically deploy on push to master
   - First deployment will run migrations and start the app

#### Option 2: Deploy via CLI

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   railway init
   ```

4. **Add PostgreSQL**
   ```bash
   railway add postgresql
   ```

5. **Set Environment Variables**
   ```bash
   railway variables set NEXTAUTH_URL=https://your-app-name.railway.app
   railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)
   railway variables set ANTHROPIC_API_KEY=your-key-here
   ```

6. **Deploy**
   ```bash
   railway up
   ```

### Post-Deployment

After deployment, you'll need to:

1. **Run Database Seed** (optional)
   - SSH into your Railway service or use the Railway CLI
   - Run: `npm run seed` to populate initial data

2. **Access Your App**
   - Your app will be available at: `https://your-app-name.railway.app`

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string (auto-set by Railway) | Yes |
| `NEXTAUTH_URL` | Your app's URL | Yes |
| `NEXTAUTH_SECRET` | Secret for NextAuth (generate with `openssl rand -base64 32`) | Yes |
| `ANTHROPIC_API_KEY` | Claude API key | Yes |
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