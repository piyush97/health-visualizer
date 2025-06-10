import { auth } from "@clerk/nextjs/server";
import { Activity } from "lucide-react";
import { redirect } from "next/navigation";

import { AuthSignIn } from "~/components/auth-signin";


export default async function SignInPage() {
  const session = await auth();

  // Redirect authenticated users to dashboard
  if (session?.userId) {
    redirect("/dashboard");
  }

  return (
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
          </div>
        </div>
      </header>

      {/* Sign In Section */}
      <div className="flex items-center justify-center px-4 py-16">
        <AuthSignIn />
      </div>
    </main>
  );
}
