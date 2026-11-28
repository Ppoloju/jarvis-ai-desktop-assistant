const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const isLoopback = (value) => LOOPBACK_HOSTS.has(String(value).toLowerCase());

const hostnameOf = (header) => {
  const value = String(header ?? "").trim();

  const bracketed = value.match(/^\[([^\]]+)\](?::\d+)?$/);

  if (bracketed) {
    return bracketed[1].toLowerCase();
  }

  return value.split(":")[0].toLowerCase();
};

// Screenshots are meant to be embedded by the dashboard, which may be served
// from another origin (VITE_API_BASE); everything else stays same-origin.
const isPublicAsset = (pathname) => pathname.startsWith("/screenshots/");

// Small, dependency-free set of headers that matter for a local app: nothing
// may frame it, sniff its responses or cache the user's data.
export const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader(
    "Cross-Origin-Resource-Policy",
    isPublicAsset(req.path) ? "cross-origin" : "same-origin"
  );
  res.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=(self)");

  if (req.path === "/api" || req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store");
  }

  next();
};

// While the API listens on loopback, only answer requests addressed to it by a
// loopback name. That stops a public hostname from being pointed at 127.0.0.1
// (DNS rebinding) and reaching the API from a web page.
export const rejectForeignHosts = (req, res, next) => {
  if (!isLoopback(process.env.HOST || "127.0.0.1")) {
    next();
    return;
  }

  const hostname = hostnameOf(req.headers.host);

  if (!hostname || isLoopback(hostname)) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    message: "Requests must be addressed to this computer",
  });
};
