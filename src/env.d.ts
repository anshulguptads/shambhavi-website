/// <reference types="astro/client" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

/** Bindings + secrets available to server routes (Astro.locals.runtime.env). */
interface Env {
  DB?: D1Database;
  RESEND_API_KEY?: string;
  FORMS_TO?: string;
  FORMS_FROM?: string;
  TURNSTILE_SECRET_KEY?: string;
}

declare namespace App {
  interface Locals extends Runtime {}
}
