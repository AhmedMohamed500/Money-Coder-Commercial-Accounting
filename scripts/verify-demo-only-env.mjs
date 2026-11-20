const forbidden = [
  "DATABASE_URL", "DIRECT_URL", "AUTH_SECRET", "NEXTAUTH_SECRET", "SESSION_SECRET",
  "SMTP_HOST", "SMTP_USER", "SMTP_PASS", "RESEND_API_KEY",
  "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN",
  "S3_BUCKET", "S3_ENDPOINT", "NEON_API_KEY", "N8N_API_KEY",
  "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
];

if (process.env.DEMO_ONLY_DEPLOYMENT !== "1") {
  throw new Error("Demo build refused: set DEMO_ONLY_DEPLOYMENT=1 in the separate demo project.");
}

const present = forbidden.filter(name => typeof process.env[name] === "string" && process.env[name].trim() !== "");
if (present.length) {
  throw new Error(`Demo build refused: production-capable environment variables are present (${present.join(", ")}). Remove them from the demo project.`);
}

console.log("Demo-only environment verified: no denied production credentials detected.");
