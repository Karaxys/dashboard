import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-300 dark:bg-slate-950 transition-colors duration-300">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <main className="flex w-full max-w-3xl flex-col items-center gap-8 px-8 text-center sm:items-start sm:text-left">
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
            Build your next idea <br className="hidden sm:inline" />
            <span className="text-blue-600 dark:text-blue-400">faster.</span>
          </h1>
          <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Welcome to Karaxys API Vulnerability Scanner.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg" className="font-semibold">
            <Link href="/dashboard">
              Get Started
            </Link>
          </Button>
        </div>

      </main>
    </div>
  );
}