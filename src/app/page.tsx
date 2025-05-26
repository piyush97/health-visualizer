import { currentUser } from "@clerk/nextjs/server";
import {
  Activity,
  Heart,
  MessageSquare,
  Shield,
  TrendingUp,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { HydrateClient } from "~/trpc/server";

export default async function Home() {
  const user = await currentUser();

  // Redirect authenticated users to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <HydrateClient>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center space-x-3">
                <Activity className="h-8 w-8 text-blue-500" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Health Visualizer
                </h1>
              </div>
              <Link
                href="/sign-in"
                className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
              >
                Sign In
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <Heart className="h-16 w-16 animate-pulse text-red-500" />
                <TrendingUp className="absolute -top-2 -right-2 h-8 w-8 text-green-500" />
              </div>
            </div>

            <h1 className="mb-6 text-4xl font-bold text-gray-900 md:text-6xl">
              Visualize Your{" "}
              <span className="text-blue-600">Health Journey</span>
            </h1>

            <p className="mx-auto mb-8 max-w-3xl text-xl text-gray-600">
              Upload your Apple Health data and discover insights about your
              wellness with beautiful visualizations and AI-powered
              recommendations.
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-600"
              >
                Get Started
                <Activity className="ml-2 h-5 w-5" />
              </Link>
              <a
                href="#features"
                className="rounded-lg border border-gray-300 px-8 py-4 text-lg font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-gray-900">
                Powerful Health Analytics
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-gray-600">
                Transform your health data into actionable insights with our
                comprehensive analytics platform.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg bg-blue-50 p-6 text-center">
                <Upload className="mx-auto mb-4 h-12 w-12 text-blue-500" />
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  Easy Data Upload
                </h3>
                <p className="text-gray-600">
                  Simply export your data from Apple Health and upload the XML
                  file. We&apos;ll handle the rest automatically.
                </p>
              </div>

              <div className="rounded-lg bg-green-50 p-6 text-center">
                <TrendingUp className="mx-auto mb-4 h-12 w-12 text-green-500" />
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  Interactive Charts
                </h3>
                <p className="text-gray-600">
                  Visualize your health trends with beautiful, interactive
                  charts and graphs. Spot patterns and track progress over time.
                </p>
              </div>

              <div className="rounded-lg bg-purple-50 p-6 text-center">
                <MessageSquare className="mx-auto mb-4 h-12 w-12 text-purple-500" />
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  AI Health Assistant
                </h3>
                <p className="text-gray-600">
                  Get personalized insights and recommendations from our
                  AI-powered health assistant based on your data patterns.
                </p>
              </div>

              <div className="rounded-lg bg-red-50 p-6 text-center">
                <Heart className="mx-auto mb-4 h-12 w-12 text-red-500" />
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  Comprehensive Metrics
                </h3>
                <p className="text-gray-600">
                  Track steps, heart rate, sleep, weight, and dozens of other
                  health metrics from your Apple Health data.
                </p>
              </div>

              <div className="rounded-lg bg-yellow-50 p-6 text-center">
                <Shield className="mx-auto mb-4 h-12 w-12 text-yellow-500" />
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  Privacy First
                </h3>
                <p className="text-gray-600">
                  Your health data is encrypted and secure. We never share your
                  personal information with third parties.
                </p>
              </div>

              <div className="rounded-lg bg-indigo-50 p-6 text-center">
                <Activity className="mx-auto mb-4 h-12 w-12 text-indigo-500" />
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  Real-time Analysis
                </h3>
                <p className="text-gray-600">
                  Get instant analysis of your health data with real-time
                  processing and immediate insights.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-blue-500 py-16">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="mb-4 text-3xl font-bold text-white">
              Ready to Understand Your Health Better?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-xl text-blue-100">
              Join thousands of users who have discovered valuable insights
              about their health and wellness.
            </p>
            <Link
              href="/sign-in"
              className="inline-flex items-center rounded-lg bg-white px-8 py-4 text-lg font-semibold text-blue-500 transition-colors hover:bg-gray-100"
            >
              Start Your Health Journey
              <Activity className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-gray-900 py-8 text-white">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <div className="mb-4 flex items-center justify-center space-x-2">
              <Activity className="h-6 w-6" />
              <span className="text-lg font-semibold">Health Visualizer</span>
            </div>
            <p className="text-gray-400">
              Built with Next.js, tRPC, and the T3 Stack. Your health data,
              visualized beautifully.
            </p>
          </div>
        </footer>
      </main>
    </HydrateClient>
  );
}
