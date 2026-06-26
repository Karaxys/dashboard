// Maps backend OAuth callback error codes to user-facing messages.
const messages: Record<string, string> = {
  access_denied: "Sign in was cancelled.",
  invalid_state: "Your sign-in session expired. Please try again.",
  missing_code: "The provider did not return an authorization code.",
  exchange_failed: "Could not complete sign in with the provider.",
  profile_failed: "Could not read your profile from the provider.",
  email_unverified: "Your provider email is not verified, so it can't be linked to an existing account.",
  account_exists: "An account with this email already exists. Sign in with your password instead.",
  session_failed: "Could not start your session. Please try again.",
  login_failed: "Sign in failed. Please try again.",
}

export function oauthErrorMessage(code: string): string {
  return messages[code] || "Sign in failed. Please try again."
}
