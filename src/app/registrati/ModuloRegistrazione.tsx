"use client";

import { useActionState } from "react";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import {
  registratiAction,
  type RegistrazioneResult,
} from "@/lib/auth/actions";
import { Turnstile } from "./Turnstile";

const initialState: RegistrazioneResult = {};

const campoClass =
  "rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";

export function ModuloRegistrazione({
  sitekey,
  nonce,
}: {
  sitekey: string;
  nonce?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    registratiAction,
    initialState
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold">Chiedi un accesso</h1>
          <p className="text-sm text-muted-foreground">
            Compila il modulo: la richiesta viene esaminata a mano prima di
            aprirti l&apos;app.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="nome" className="text-sm font-medium">
              Come ti chiami
            </label>
            <input
              id="nome"
              name="nome"
              required
              minLength={2}
              autoComplete="name"
              className={campoClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={campoClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={campoClass}
            />
            <span className="text-xs text-muted-foreground">
              Almeno 8 caratteri.
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="passwordConferma" className="text-sm font-medium">
              Ripeti la password
            </label>
            <input
              id="passwordConferma"
              name="passwordConferma"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={campoClass}
            />
          </div>

          <Turnstile sitekey={sitekey} nonce={nonce} />

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Invio…" : "Manda la richiesta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Hai già un accesso?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Entra
          </Link>
        </p>
      </div>
    </div>
  );
}
