export async function signOut() {
  const response = await fetch("/api/auth/signout", {
    method: "POST",
    credentials: "same-origin",
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string
    }
    throw new Error(data.error ?? "Unable to sign out.")
  }

  window.location.href = "/"
}
