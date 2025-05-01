# Word Ladder War

A fast-paced word game where you form words from a single word. Climb the ladder. Flex your vocabulary skills.

![Word Ladder War](public/site-image.png)

## 🎮 Play Now

Visit [word-ladder-war.vercel.app](https://word-ladder-war.vercel.app) to play the game!

## 🍴 Forking This Project

This guide will help you successfully fork and run this project on your own environment.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Supabase](https://supabase.com/) account (free tier works fine)

### Step 1: Fork and Clone the Repository

1. Fork this repository using the "Fork" button at the top right of the GitHub page
2. Clone your forked repository:
   \`\`\`bash
   git clone https://github.com/YOUR_USERNAME/word-ladder-war.git
   cd word-ladder-war
   \`\`\`

### Step 2: Install Dependencies

\`\`\`bash
npm install
# or
yarn install
\`\`\`

### Step 3: Set Up Supabase

1. Create a new project on [Supabase](https://supabase.com/)
2. Once your project is created, go to the SQL Editor in your Supabase dashboard
3. Run the following SQL to create the necessary tables:

\`\`\`sql
-- Create players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nickname TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_scores table
CREATE TABLE game_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id),
  nickname TEXT NOT NULL,
  score INTEGER NOT NULL,
  word_count INTEGER NOT NULL,
  time_taken INTEGER NOT NULL,
  main_word TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_game_scores_score ON game_scores(score DESC);
CREATE INDEX idx_game_scores_word_count ON game_scores(word_count DESC);
CREATE INDEX idx_game_scores_player_id ON game_scores(player_id);
\`\`\`

4. Enable realtime for the `game_scores` table:
   - Go to Database → Replication
   - Click on "Tables" and find `game_scores`
   - Enable "Realtime" for this table

### Step 4: Set Up Environment Variables

1. Copy the `.env.example` file to `.env.local`:
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`

2. Fill in your Supabase credentials in `.env.local`:
   - Go to your Supabase project settings → API
   - Copy the URL and anon/public key
   - Update the following variables in your `.env.local` file:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
\`\`\`

### Step 5: Run the Development Server

\`\`\`bash
npm run dev
# or
yarn dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

### Step 6: Deploy to Vercel (Optional)

1. Push your repository to GitHub
2. Import your repository on [Vercel](https://vercel.com/new)
3. Add the environment variables from your `.env.local` file to your Vercel project
4. Deploy!

## 🔍 Troubleshooting Common Issues

### "Failed to fetch" Error in Leaderboard

If you see a "Failed to fetch" error in the leaderboard:

1. Check that your Supabase URL and API keys are correct
2. Ensure you've created the required database tables
3. Check that you've enabled realtime for the `game_scores` table
4. Verify your browser console for more specific error messages

### Database Connection Issues

If you're having trouble connecting to your Supabase database:

1. Make sure your IP isn't restricted in Supabase settings
2. Check that your environment variables are correctly set
3. Verify your Supabase project is active (not paused)

### Deployment Issues

If you're having issues deploying to Vercel:

1. Make sure all environment variables are set in your Vercel project settings
2. Check the build logs for any errors
3. Ensure your Node.js version is set to 18 or newer in the Vercel settings

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Built with [Next.js](https://nextjs.org/)
- Database by [Supabase](https://supabase.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Animations with [Framer Motion](https://www.framer.com/motion/)
\`\`\`

Now, let's create an `.env.example` file to help people set up their environment variables:

```plaintext file=".env.example"
# Supabase Configuration
# Replace these with your own values from your Supabase project

# Public variables (accessible in browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Private variables (server-side only)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here

# Optional: Vercel Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS=true
