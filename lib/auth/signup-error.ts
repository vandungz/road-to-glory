const messages = {
  email_address_invalid: "signupEmailInvalid",
  weak_password: "signupPasswordWeak",
  over_email_send_rate_limit: "signupEmailRateLimited",
  over_request_rate_limit: "signupRequestRateLimited",
  email_address_not_authorized: "signupEmailUnavailable",
  email_provider_disabled: "signupUnavailable",
  signup_disabled: "signupUnavailable",
  confirmation_disabled: "signupUnavailable",
  unexpected_failure: "signupFailed",
  request_timeout: "signupFailed",
  email_exists: "signupFailed",
  user_already_exists: "signupFailed",
} as const;

export function classifySignupError(error: unknown) {
  const value = error && typeof error === "object" ? error : {};
  const code = "code" in value && typeof value.code === "string" &&
    Object.hasOwn(messages, value.code)
    ? value.code as keyof typeof messages : "unknown";
  const status = "status" in value && typeof value.status === "number" &&
    Number.isInteger(value.status) && value.status >= 400 && value.status <= 599
    ? value.status : undefined;

  // Never pass raw provider messages, credentials or account existence to the UI/logs.
  return { code, status, messageKey: code === "unknown" ? "signupFailed" as const : messages[code] };
}
