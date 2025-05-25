"use client";

import { Github, LogOut, User } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export function AuthSignIn() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-pulse">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (session) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <User className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle>Welcome back!</CardTitle>
          <CardDescription>Signed in as {session.user?.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {session.user?.image && (
            <div className="flex justify-center">
              <img
                src={session.user.image}
                alt="Profile"
                className="h-16 w-16 rounded-full"
              />
            </div>
          )}
          <div className="text-center">
            <p className="mb-4 text-sm text-gray-600">{session.user?.name}</p>
            <Button
              onClick={() => signOut()}
              variant="outline"
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <Github className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle>Sign in to Health Visualizer</CardTitle>
        <CardDescription>
          Connect your GitHub account to get started with analyzing your health
          data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => signIn("github")}
          className="w-full bg-gray-900 text-white hover:bg-gray-800"
        >
          <Github className="mr-2 h-4 w-4" />
          Sign in with GitHub
        </Button>
      </CardContent>
    </Card>
  );
}
