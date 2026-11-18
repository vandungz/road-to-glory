import assert from "node:assert/strict";
import { classifySignupError } from "../lib/auth/signup-error";
import vi from "../i18n/messages/vi.json";
import en from "../i18n/messages/en.json";

const cases = [
  ["weak_password", "signupPasswordWeak"],
  ["email_address_invalid", "signupEmailInvalid"],
  ["over_email_send_rate_limit", "signupEmailRateLimited"],
  ["over_request_rate_limit", "signupRequestRateLimited"],
  ["email_address_not_authorized", "signupEmailUnavailable"],
  ["signup_disabled", "signupUnavailable"],
  ["confirmation_disabled", "signupUnavailable"],
  ["unexpected_failure", "signupFailed"],
  ["email_exists", "signupFailed"],
  ["user_already_exists", "signupFailed"],
] as const;

for (const [code, expected] of cases) {
  const result = classifySignupError({ code, status: 422, message: "private@example.test" });
  assert.equal(result.messageKey, expected);
  assert.ok(vi.auth[result.messageKey]);
  assert.ok(en.auth[result.messageKey]);
  assert.doesNotMatch(JSON.stringify(result), /private@example/);
}
for (const error of [null, new Error("password=private"), { code: "private@example.test", status: Infinity }]) {
  assert.deepEqual(classifySignupError(error), { code: "unknown", status: undefined, messageKey: "signupFailed" });
}
console.log("Signup errors: specific messages, private account state and safe diagnostic fields.");
