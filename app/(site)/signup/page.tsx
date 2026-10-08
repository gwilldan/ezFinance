import { SignupForm } from "@/components/signup-form"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign up",
  description:
    "Create a free ezFinance account. Your first bank statement report is free, with no card required.",
  alternates: { canonical: "/signup" },
}

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  )
}
