import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ResetPasswordForm } from "../app/(auth)/auth/reset-password/ResetPasswordForm";

// Render both entry states without sending email or changing a real password.
const request = renderToStaticMarkup(<ResetPasswordForm canUpdatePassword={false} />);
assert.match(request, /type="email"/);
assert.match(request, /Gửi liên kết khôi phục/);
assert.doesNotMatch(request, /type="password"/);

const update = renderToStaticMarkup(<ResetPasswordForm canUpdatePassword />);
assert.match(update, /type="password"/);
assert.match(update, /minLength="8"/);
assert.match(update, /Lưu mật khẩu/);
assert.doesNotMatch(update, /type="email"/);
console.log("Auth recovery: request and empty new-password states render correctly.");
