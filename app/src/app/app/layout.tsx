import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/app" className="text-lg font-light tracking-tight">
            Touch<span className="text-accent">Screen</span>
          </Link>
          <div className="flex items-center gap-6">
            <span className="text-sm text-muted">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
