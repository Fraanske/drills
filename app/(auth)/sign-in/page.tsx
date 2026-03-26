import { signInWithPassword } from "./actions";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Log in with an e-mail address and password for a user you created in Supabase Authentication.
        </p>

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form action={signInWithPassword} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              name="email"
              placeholder="coach@example.com"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Temporary password"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
              required
            />
          </div>
          <button type="submit" className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
