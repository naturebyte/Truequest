import type { FormEvent } from "react";

type LoginFormProps = {
  username: string;
  password: string;
  isLoading: boolean;
  errorMessage: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export function LoginForm({
  username,
  password,
  isLoading,
  errorMessage,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="mt-6 text-3xl font-bold text-[#2b24ff] sm:text-4xl">Admin Panel</h1>
      </div>
      <form
        onSubmit={onSubmit}
        className="mx-auto max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <label className="block">
          <span className="mb-1 block text-sm text-slate-700">Username</span>
          <input
            required
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-slate-700">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
          />
        </label>

        {errorMessage && (
          <p className="rounded-xl border border-red-300/60 bg-red-500/70 px-4 py-3 text-sm">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-[#2b24ff] px-4 py-3 font-semibold text-white transition hover:bg-[#221bff] disabled:cursor-not-allowed disabled:opacity-80"
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </>
  );
}
