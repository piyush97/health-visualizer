# Health Visualizer - Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview

This is a Next.js application built with the T3 stack for analyzing Apple Health data exports. The app allows users to upload their Apple Health XML data, visualizes health metrics, and provides AI-powered health insights through a chatbot interface.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **API**: tRPC for type-safe APIs
- **Styling**: Tailwind CSS
- **Charts**: Chart.js or Recharts for data visualization
- **AI**: OpenAI API for chatbot functionality
- **File Processing**: XML parsing for Apple Health data

## Key Features

1. **Apple Health Data Upload**: XML file upload and parsing
2. **Data Visualization**: Interactive charts and graphs for health metrics
3. **AI Chatbot**: Health insights and recommendations
4. **User Authentication**: Secure user sessions
5. **Data Storage**: Processed health data storage in PostgreSQL

## Development Guidelines

- Use TypeScript strictly with proper type definitions
- Follow tRPC patterns for API routes
- Use Prisma schema for database operations
- Implement proper error handling and loading states
- Follow Next.js App Router conventions
- Use Tailwind CSS for consistent styling
- Ensure data privacy and security for health information

## File Structure

- `/src/app` - Next.js App Router pages and layouts
- `/src/server` - tRPC API routes and procedures
- `/src/lib` - Utility functions and shared logic
- `/src/components` - Reusable React components
- `/prisma` - Database schema and migrations
- `/src/types` - TypeScript type definitions

## Special Considerations

- Handle large XML files efficiently
- Implement proper data validation for health metrics
- Ensure HIPAA-compliant data handling practices
- Use server-side processing for file parsing
- Implement proper error boundaries and fallbacks
