"use client"

import {FormEvent, useState} from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/password-input"

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

export function LoginForm({
  className,
  onSwitchToSignup,
  ...props
}: React.ComponentProps<"div"> & { onSwitchToSignup?: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "")
    const password = String(formData.get("password") ?? "")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        message?: string
        error?: string
        user?: { id?: string; email?: string }
      }

      if (!response.ok) {
        setError(data.error ?? "Unable to sign in.")
        return
      }

      setMessage(data.message ?? "Signed in successfully.")
      console.log("Login successful", data.user)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleLogin() {
    setError(null)
    setMessage(null)

    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ redirectTo: window.location.origin }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        url?: string
        error?: string
      }

      if (!response.ok || !data.url) {
        setError(data.error ?? "Unable to sign in with Google.")
        return
      }

      window.location.assign(data.url)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign in with Google."
      )
    }
  }

  return (
    <div className={cn("w-full", className)} {...props}>
      <Card className="gap-0 rounded-[1.5rem] bg-white px-7 py-7 text-slate-950 shadow-2xl ring-1 ring-slate-200 sm:px-8">
        <CardHeader className="items-center px-0 pt-0 text-center">
          <CardTitle className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            Welcome back
          </CardTitle>
          <CardDescription className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-600">
            Sign in to continue planning your finances with ezFinance.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-0 pt-6">
          <Button
            type="button"
            variant="outline"
            className="h-13 w-full rounded-2xl border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
          >
            <GoogleIcon /> Continue with Google
          </Button>

          <div className="my-7 flex items-center gap-3 text-xs font-semibold text-slate-300">
            <div className="h-px flex-1 bg-slate-200" />
            OR
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit}>
            <FieldGroup className="gap-3">
              <Field>
                <FieldLabel htmlFor="email" className="sr-only">
                  Email
                </FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className="h-13 rounded-2xl border-slate-200 bg-white px-4 text-base text-slate-950 placeholder:text-slate-400 focus-visible:border-cyan-accent focus-visible:ring-cyan-accent/20 md:text-sm"
                  required
                  disabled={isSubmitting}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password" className="sr-only">
                  Password
                </FieldLabel>
                <PasswordInput
                  id="password"
                  name="password"
                  placeholder="Password"
                  className="h-13 rounded-2xl border-slate-200 bg-white px-4 text-base text-slate-950 placeholder:text-slate-400 focus-visible:border-cyan-accent focus-visible:ring-cyan-accent/20 md:text-sm"
                  required
                  disabled={isSubmitting}
                />
              </Field>
              {(error || message) && (
                <p
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm",
                    error
                      ? "bg-red-50 text-red-600"
                      : "bg-emerald-50 text-emerald-700"
                  )}
                >
                  {error ?? message}
                </p>
              )}
              <Field className="gap-4">
                <Button
                  type="submit"
                  className="h-13 rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 hover:bg-slate-800"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
                <button
                  type="button"
                  className="self-end text-sm font-medium text-slate-500 transition-colors hover:text-slate-950 disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => console.log("Forgot password clicked")}
                  disabled={isSubmitting}
                >
                  Forgot password?
                </button>
                <FieldDescription className="text-center text-sm text-slate-500">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    className="font-semibold text-slate-950 hover:underline disabled:pointer-events-none disabled:opacity-50"
                    onClick={onSwitchToSignup}
                    disabled={isSubmitting}
                  >
                    Sign up
                  </button>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
