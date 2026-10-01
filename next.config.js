/** @type {import('next').NextConfig} */

/*
  Content-Security-Policy
  ------------------------------------------------------------------
  Scoped to what the app actually loads today (no external CDNs, no
  analytics, wallet is mocked).  See docs/security-headers.md for the
  rationale behind each directive, the unavoidable `unsafe-inline` on
  styles, and a concrete path to tighten the policy later.

  Quick reference for future wallet integration:
    connect-src additions: https://*.infura.io wss://*.infura.io (MetaMask RPC)
                           wss://relay.walletconnect.com          (WalletConnect relay)
    script-src may also need the provider's injection origin.
*/
// Build CSP directives conditionally based on environment
const cspDirectives = ["default-src 'self'"];
if (process.env.NODE_ENV === 'development') {
  // Development: allow unsafe-eval for Fast Refresh and unsafe-inline for Tailwind styles
  cspDirectives.push("script-src 'self' 'unsafe-eval'");
  cspDirectives.push("style-src 'self' 'unsafe-inline'");
} else {
  // Production: tighten CSP
  cspDirectives.push("script-src 'self'");
  cspDirectives.push("style-src 'self'");
}
cspDirectives.push(
  "img-src 'self' data:'",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
);
const cspHeader = cspDirectives.join('; ');

const nextConfig = {
  reactStrictMode: true,

  /**
   * Apply baseline security headers to every response.
   * Revisit COOP/CORP if the app later adds popup auth flows,
   * cross-site asset sharing, or third-party embeds.
   */
  async headers() {
    return [
      {
        // Apply security headers to every route
        source: '/(.*)',
        headers: [
          // Restrict resource origins without changing the existing dev/prod CSP behavior.
          { key: 'Content-Security-Policy', value: cspHeader },
          // Legacy clickjacking protection for browsers that do not enforce frame-ancestors.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME sniffing so assets are interpreted as declared.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Keep full referrers on same-origin navigation and trim cross-origin referrers to origin only.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Isolate the top-level browsing context from cross-origin windows and popups.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // Prevent other origins from embedding or hotlinking app-served assets.
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          // Enforce HTTPS in supported browsers once the site is loaded over TLS.
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },

          // Bonus hardening headers (not part of the original spec but
          // recommended by OWASP and the security community):
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
