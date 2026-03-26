export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Wire this page to Supabase email magic links, Google, or password auth after your project is created.
        </p>

        <form className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <input type="email" placeholder="coach@example.com" className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          </div>
          <button type="button" className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
            Send sign-in link
          </button>
        </form>
      </div>
    </main>
  );
}
