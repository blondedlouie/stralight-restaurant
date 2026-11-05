import Link from "next/link";
import { Shield } from "lucide-react";

export default function AdminForbiddenPage() {
  return (
    <main className="flex min-h-[60dvh] items-center justify-center px-4 py-12">
      <section className="max-w-md rounded-3xl border border-purple-950/10 bg-white/80 p-8 text-center shadow-sm backdrop-blur-xl">
        <Shield className="mx-auto h-10 w-10 text-brand-accent" />
        <h1 className="mt-4 font-display text-2xl text-purple-950">Access not assigned</h1>
        <p className="mt-2 text-sm text-brand-textMuted">Your staff account does not have access to that workspace.</p>
        <Link href="/admin/login" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-yellow-400 px-5 text-sm font-extrabold text-purple-950">Switch account</Link>
      </section>
    </main>
  );
}
