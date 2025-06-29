# Health Visualizer

A comprehensive health analytics platform that transforms your Apple Health data into actionable insights with beautiful visualizations and AI-powered recommendations.

## Features

- **Easy Data Upload**: Simply export your data from Apple Health and upload the XML file
- **Interactive Charts**: Visualize health trends with beautiful, interactive charts and graphs
- **AI Health Assistant**: Get personalized insights and recommendations based on your data patterns
- **Comprehensive Metrics**: Track steps, heart rate, sleep, weight, and dozens of other health metrics
- **Privacy First**: Your health data is encrypted and secure with no third-party sharing
- **Real-time Analysis**: Instant analysis of your health data with immediate insights

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn package manager
- PostgreSQL database

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
Fill in your database URL, Clerk authentication keys, and other required environment variables.

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
- **Docker**: Use the provided Docker configuration

Make sure to set up your environment variables and database connection in your deployment platform.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
