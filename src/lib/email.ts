import nodemailer from "nodemailer";
import { emailConfigured } from "@/lib/config";

export async function sendTransactionalEmail(input: { to: string; subject: string; text: string; html: string }) {
  if (!emailConfigured()) throw new Error("Email provider is not configured");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  await transporter.sendMail({ from: process.env.EMAIL_FROM, ...input });
}
