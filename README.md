# Health Visualizer

![License: MIT](https://img.shields.io/badge/license-MIT-blue)

Upload your Apple Health data and ask AI what you need to do to improve your health.

A comprehensive health analytics platform that transforms your Apple Health data into actionable insights with beautiful visualizations and AI-powered recommendations.

## Features

- **Easy Data Upload**: Simply export your data from Apple Health and upload the XML file
- **Interactive Charts**: Visualize health trends with beautiful, interactive charts and graphs
- **AI Health Assistant**: Get personalized insights and recommendations based on your data patterns
- **Comprehensive Metrics**: Track steps, heart rate, sleep, weight, and dozens of other health metrics
- **Real-time Analysis**: Instant analysis of your health data with immediate insights

## Privacy

Your health data is sensitive, and this project takes that seriously. Here is exactly what happens to your data:

- **Your uploaded file is processed and deleted.** The Apple Health export you upload is written to a temporary server directory, streamed and parsed into records, and then removed from the server immediately after parsing. The raw XML file is never kept.
- **Parsed records are stored in your own account only.** The extracted health records, upload metadata, and your chat history are stored in the PostgreSQL database that *you* provision and configure for your deployment. All data is scoped to your user account and is never shared with or sold to third parties.
- **AI analysis is opt-in and provider-configured by you.** The AI Health Assistant only runs when you ask a question. It sends your message plus a summary of your recent health records (data types, record counts, and latest values) to the AI provider you configured — by default OpenAI, via the `OPENAI_API_KEY` you provide. No health data leaves your deployment for any purpose other than answering your questions through the AI provider you set up.
- **You can delete your data.** You can clear your chat history and remove uploads and their records directly from the app.

If you self-host, you control the entire stack — the server, the database, and the API keys — so you decide who (if anyone) your data is sent to.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn package manager
- PostgreSQL database
- An OpenAI API key (for the AI Health Assistant)

### Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

The required environment variables are:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | API key for the AI Health Assistant (OpenAI) |
| `CLERK_SECRET_KEY` | Clerk backend secret key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend publishable key |

The full set of variables and their expected format is documented in `.env.example`.

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd health-visualizer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```
Fill in your database URL, Clerk authentication keys, and OpenAI API key as described above.

4. Set up the database:
```bash
npm run db:push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Tech Stack

This project is built with the [T3 Stack](https://create.t3.gg/):

- **Framework**: [Next.js](https://nextjs.org) with App Router
- **Authentication**: [Clerk](https://clerk.com) for user management
- **Database**: [Prisma](https://prisma.io) ORM with PostgreSQL
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **API**: [tRPC](https://trpc.io) for type-safe APIs
- **UI Components**: [Radix UI](https://www.radix-ui.com/) with custom styling
- **Charts**: [Chart.js](https://www.chartjs.org/) and [Recharts](https://recharts.org/)
- **AI Integration**: OpenAI SDK for health insights

## Available Scripts

- `npm run dev` - Start development server with Turbo
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run db:push` - Push database schema changes
- `npm run db:studio` - Open Prisma Studio
- `npm run format:write` - Format code with Prettier

## How to Use

1. **Sign Up**: Create an account or sign in with your existing credentials
2. **Export Apple Health Data**: Export your health data from the Apple Health app as an XML file
3. **Upload Data**: Use the upload feature to process your health data
4. **Explore Insights**: View interactive charts and get AI-powered health recommendations
5. **Chat with AI**: Ask questions about your health data and get personalized insights

## Deployment

This application can be deployed on various platforms:

- **Vercel** (recommended): Connect your GitHub repository for automatic deployments
- **Railway**: Deploy with PostgreSQL database

Make sure to set up your environment variables and database connection in your deployment platform.

## License

This project is licensed under the [MIT License](LICENSE).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
