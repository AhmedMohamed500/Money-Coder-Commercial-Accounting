const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#201827"/>
  <path d="M16 43V20h7l9 13 9-13h7v23h-7V31L32 44 23 31v12z" fill="#F6F2EC"/>
  <circle cx="49" cy="15" r="5" fill="#A78BE8"/>
</svg>`;

export function GET() {
  return new Response(favicon, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
