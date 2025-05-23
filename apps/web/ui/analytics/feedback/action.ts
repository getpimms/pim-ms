"use server";

import { resend } from "@dub/email/resend";
import { FeedbackEmail } from "@dub/email/templates/feedback-email";

export async function submitFeedback(data: FormData) {
  const email = data.get("email") as string;
  const feedback = data.get("feedback") as string;

  return await resend?.emails.send({
    from: "alexandre+feedback@pimms.io",
    to: "alexandre@pimms.io",
    ...(email && { replyTo: email }),
    subject: "🎉 New Feedback Received!",
    react: FeedbackEmail({ email, feedback }),
  });
}
