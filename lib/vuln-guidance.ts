/**
 * Vulnerability guidance: what a finding means, how the scanner proved it, how
 * to fix it, and which OWASP category it maps to.
 *
 * Every entry is specific to its test type on purpose. Sharing one bloc between
 * related checks (all "exposure" tests, both JWT tests, BOLA variants) made the
 * remediation read identically everywhere, which is useless for triage: the fix
 * for leaking a metrics endpoint is not the fix for an exposed .git directory.
 *
 * OWASP references: API categories are the OWASP API Security Top 10 (2023);
 * injection/XSS/redirect use the OWASP Top 10 (2021) where that is the correct
 * mapping rather than the API list.
 */

export interface OwaspRef {
  /** e.g. "API1:2023" or "A03:2021" */
  id: string
  name: string
  url: string
}

export interface VulnGuidance {
  owasp: OwaspRef
  cwe?: string
  /** One or two sentences: what an attacker can actually do. */
  summary: string
  /** How the scanner established this, in reviewer language. */
  howProved: string
  /** Concrete remediation steps specific to this weakness, most important first. */
  fix: string[]
  references?: { label: string; url: string }[]
}

const API = "https://owasp.org/API-Security/editions/2023/en"
const WEB = "https://owasp.org/Top10"

const BOLA_API: OwaspRef = { id: "API1:2023", name: "Broken Object Level Authorization", url: `${API}/0xa1-broken-object-level-authorization/` }
const AUTH_API: OwaspRef = { id: "API2:2023", name: "Broken Authentication", url: `${API}/0xa2-broken-authentication/` }
const PROPS_API: OwaspRef = { id: "API3:2023", name: "Broken Object Property Level Authorization", url: `${API}/0xa3-broken-object-property-level-authorization/` }
const BFLA_API: OwaspRef = { id: "API5:2023", name: "Broken Function Level Authorization", url: `${API}/0xa5-broken-function-level-authorization/` }
const SSRF_API: OwaspRef = { id: "API7:2023", name: "Server-Side Request Forgery", url: `${API}/0xa7-server-side-request-forgery/` }
const MISCONF_API: OwaspRef = { id: "API8:2023", name: "Security Misconfiguration", url: `${API}/0xa8-security-misconfiguration/` }
const A01: OwaspRef = { id: "A01:2021", name: "Broken Access Control", url: `${WEB}/A01_2021-Broken_Access_Control/` }
const A03: OwaspRef = { id: "A03:2021", name: "Injection", url: `${WEB}/A03_2021-Injection/` }

const REPRO_STEP = "Add a regression test that performs the same request and expects a denial, so the fix cannot silently regress."

const GUIDANCE: Record<string, VulnGuidance> = {
  BOLA: {
    owasp: BOLA_API,
    cwe: "CWE-639",
    summary:
      "Any authenticated user can read another user's object by changing the identifier in the request. The endpoint validates the credential but never checks that the object belongs to the caller.",
    howProved:
      "The captured request was sent three times — with the object owner's credential, with the attacker's credential, and with none. The attacker received the same object as the owner (identical body) while the anonymous request was rejected, so the unauthorized access is real.",
    fix: [
      "After loading the object by its identifier, compare its owner/subject against the authenticated subject from the token and return 404 when they differ.",
      "Ignore any client-supplied owner, user or tenant identifier — take the subject from the session, never from the body or query.",
      "Apply the check to every verb that touches the object (read, update, delete, export), not just GET.",
      "Prefer random, unguessable object identifiers (UUID/ULID) for anything exposed to clients.",
      REPRO_STEP,
    ],
    references: [
      { label: "OWASP API1:2023", url: BOLA_API.url },
      { label: "CWE-639", url: "https://cwe.mitre.org/data/definitions/639.html" },
    ],
  },

  BOLA_PARAMETER_POLLUTION: {
    owasp: BOLA_API,
    cwe: "CWE-235",
    summary:
      "The endpoint accepts duplicate or conflicting object identifiers and resolves them inconsistently — a proxy, framework parser and controller can each pick a different value, so an attacker can smuggle a second identifier past an authorization filter.",
    howProved:
      "A duplicate identifier was injected into the captured body and the request replayed with the attacker's credential. The response matched the owner's response, so the injected value won over the one the authorization layer validated.",
    fix: [
      "Reject requests that contain duplicate parameters or JSON keys for the same field (400) instead of letting the parser pick one.",
      "Never read an identifier twice from different places — resolve the object once, from the authenticated subject, and pass it internally.",
      "Make the request parser strict: last-wins/first-wins behaviour differences between the gateway, the framework and the controller are the root cause here.",
      "Add a test that sends duplicated ids and expects 400, and one that expects the attacker's value never to be honoured.",
    ],
    references: [{ label: "OWASP API1:2023", url: BOLA_API.url }],
  },

  BOLA_CHAINED_ENUMERATION: {
    owasp: BOLA_API,
    cwe: "CWE-639",
    summary:
      "A listing endpoint exposes object identifiers that can be used directly against a detail endpoint with the attacker's own credential. The two-step chain turns an information leak into cross-account data access.",
    howProved:
      "The listing request was replayed with the attacker's credential and matched the owner's listing; the ids it returned were then used to reach the detail endpoint, which also returned data the attacker does not own.",
    fix: [
      "Authorize the detail endpoint by ownership (see BOLA) — the chain only works when the second hop is missing the check.",
      "Do not return more objects than the caller is entitled to in listings; scope the query by the authenticated subject.",
      "Avoid exposing sequential/guessable identifiers in listings; return opaque ids or slugs.",
      "Rate-limit and alert on sequential id enumeration patterns from one credential.",
    ],
    references: [
      { label: "OWASP API1:2023", url: BOLA_API.url },
      { label: "OWASP API4:2023 (enumeration)", url: `${API}/0xa4-unrestricted-resource-consumption/` },
    ],
  },

  BFLA: {
    owasp: BFLA_API,
    cwe: "CWE-285",
    summary:
      "A function reserved for a privileged role accepted the attacker's call. The route is authenticated but not authorized, so any valid account can perform an administrative action by calling it directly.",
    howProved:
      "The privileged HTTP method was replayed against the captured resource with the attacker's credential and returned the same success response the legitimate role receives, while an anonymous request was denied.",
    fix: [
      "Declare the allowed roles on the route and enforce them server-side before the handler runs (middleware or annotation).",
      "Do not derive authorization from the UI: hiding a button is not access control.",
      "Return 403 for authenticated-but-unauthorized calls and emit a security signal so role probing is visible.",
      "Review the route table for other verbs on the same resource that lack a role check.",
      REPRO_STEP,
    ],
    references: [
      { label: "OWASP API5:2023", url: BFLA_API.url },
      { label: "CWE-285", url: "https://cwe.mitre.org/data/definitions/285.html" },
    ],
  },

  BROKEN_USER_AUTH: {
    owasp: AUTH_API,
    cwe: "CWE-306",
    summary:
      "The endpoint served an authenticated user's data without any credential. Anyone who can reach the API — including unauthenticated clients — can read the response.",
    howProved:
      "The captured request was replayed with no Authorization header. The anonymous response was identical to the authenticated owner's response, so authentication is not enforced on this path at all.",
    fix: [
      "Require authentication on the route and reject missing or malformed credentials with 401 before any business logic executes.",
      "Enforce it centrally (router guard / middleware) so new routes inherit the requirement instead of relying on per-handler checks.",
      "Treat a missing credential as an error, never as an anonymous principal with access; fail closed.",
      "Audit the route table for other handlers with no auth middleware.",
      REPRO_STEP,
    ],
    references: [{ label: "CWE-306", url: "https://cwe.mitre.org/data/definitions/306.html" }],
  },

  JWT_NONE_ALGO: {
    owasp: AUTH_API,
    cwe: "CWE-347",
    summary:
      "The API accepted an unsigned token (`alg: none`). Any attacker can mint a token for any user — including administrators — without knowing the signing key.",
    howProved:
      "The captured token's header was rewritten to `alg: none` (signature stripped) and replayed. The server returned the same response as the genuine token, while an anonymous request was rejected.",
    fix: [
      "Pin the accepted algorithm on the verify call (e.g. RS256) and reject everything else, including `none` and HMAC variants of an RSA key.",
      "Verify the signature with the library's verification key; a decode-only path must never be used for authentication.",
      "Validate `iss`, `aud` and `exp` after verification, and reject tokens whose claims do not match this service.",
      "Rotate the signing key and review authentication logs for forged subject claims if this shipped to production.",
    ],
    references: [
      { label: "OWASP JWT cheat sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html" },
      { label: "CWE-347", url: "https://cwe.mitre.org/data/definitions/347.html" },
    ],
  },

  JWT_INVALID_SIGNATURE: {
    owasp: AUTH_API,
    cwe: "CWE-345",
    summary:
      "A token whose signature no longer matched its contents was accepted. Authentication can be bypassed by editing the payload of a token you already hold.",
    howProved:
      "The captured token's signature was altered (and the payload left intact, so the identity claims were attacker-chosen) and replayed. The server returned the same response as the genuine token.",
    fix: [
      "Verify the signature cryptographically on every request using the correct key, and reject on any mismatch — do not fall back to decoding.",
      "Ensure the verification library is not configured with `ignoreExpiration`/`ignoreSignature` or a permissive `algorithms` list.",
      "Re-issue tokens after the fix so previously tampered sessions cannot be replayed, and rotate the signing key.",
      "Add a test that flips one byte of the signature and expects 401.",
    ],
    references: [{ label: "CWE-345", url: "https://cwe.mitre.org/data/definitions/345.html" }],
  },

  MASS_ASSIGNMENT: {
    owasp: PROPS_API,
    cwe: "CWE-915",
    summary:
      "The API bound client-supplied fields it should have ignored (`role`, `isAdmin`, `verified`, …). A normal user can escalate their own privileges by adding fields to an ordinary update request.",
    howProved:
      "Privileged fields were injected into the captured write request, and the resource was re-read afterwards. The elevated values were still present, so they were accepted and persisted — not merely echoed.",
    fix: [
      "Bind only an explicit allow-list of writable fields per operation (DTO with declared fields) instead of binding the request body to the model.",
      "Treat role, permissions, flags and balances as server-controlled: reject them in client payloads rather than ignoring them silently.",
      "Enable strict schema validation that fails on unknown properties (e.g. `additionalProperties: false`).",
      "Audit existing records for privilege values that could only have been set through this path, and revoke any unintended admin grants.",
    ],
    references: [
      { label: "OWASP API3:2023", url: PROPS_API.url },
      { label: "CWE-915", url: "https://cwe.mitre.org/data/definitions/915.html" },
    ],
  },

  SQL_INJECTION: {
    owasp: A03,
    cwe: "CWE-89",
    summary:
      "User input reached a SQL query without parameterisation. An attacker can read or modify arbitrary tables — including user credentials — and in some cases bypass authentication entirely.",
    howProved:
      "SQL metacharacter payloads were injected into every captured parameter. The response contained the database's own error text (or a tautology payload returned an authenticated session for invalid credentials), proving the input reached the query.",
    fix: [
      "Use parameterised queries / prepared statements for every dynamic value; never concatenate or interpolate input into SQL.",
      "Where an ORM is used, call bound-parameter APIs instead of raw query fragments, and fail CI on new raw SQL.",
      "Validate input against its expected shape (an email is not a quoted string with comment markers) and reject rather than sanitise.",
      "Suppress database error details from responses and log them server-side only.",
      "Rotate credentials that were reachable through the injection and review query logs for prior exploitation.",
    ],
    references: [
      { label: "OWASP A03:2021", url: A03.url },
      { label: "SQL injection prevention", url: "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html" },
    ],
  },

  REFLECTED_XSS: {
    owasp: A03,
    cwe: "CWE-79",
    summary:
      "Markup supplied in the request is returned unescaped to the browser, so a crafted link executes script in the victim's session — enabling session theft or actions performed as the victim.",
    howProved:
      "A unique marker payload was sent in the captured parameters and located unescaped in a `text/html` response, which is what a browser would execute.",
    fix: [
      "HTML-escape every untrusted value at the point of output (use the template engine's auto-escaping; never an unsafe/raw sink).",
      "Return JSON with `Content-Type: application/json` for API responses so browsers do not render payloads as HTML.",
      "Add a restrictive Content-Security-Policy so an injected inline script cannot run even if escaping is missed.",
      "Validate/limit input length and characters for parameters that are echoed back.",
    ],
    references: [{ label: "OWASP XSS prevention", url: "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html" }],
  },

  STORED_XSS: {
    owasp: A03,
    cwe: "CWE-79",
    summary:
      "A payload submitted through the API is stored and later served to other users, so the script runs in every viewer's session — including administrators' — without any crafted link.",
    howProved:
      "The marker payload was written through the captured endpoint and the resource was read back afterwards; the payload was still present, proving persistence rather than a one-off reflection.",
    fix: [
      "Sanitise rich-text input on write with a maintained allow-list sanitiser, and also escape on read (defence in depth).",
      "Store the sanitised value, not just the sanitised render — otherwise other consumers (exports, emails, mobile) serve the payload.",
      "Apply a CSP and `HttpOnly`/`SameSite` cookies so stored script cannot reach sessions.",
      "Scan existing stored content for the payload marker and clean affected records.",
    ],
    references: [
      { label: "OWASP XSS prevention", url: "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html" },
      { label: "CWE-79", url: "https://cwe.mitre.org/data/definitions/79.html" },
    ],
  },

  SSRF: {
    owasp: SSRF_API,
    cwe: "CWE-918",
    summary:
      "The server fetched a URL chosen by the client, letting an attacker reach internal services and cloud metadata endpoints that are not reachable from the internet.",
    howProved:
      "Cloud-metadata and internal-service URLs were injected into the captured parameters and the fetched content came back in the response, proving the server made the request in-band.",
    fix: [
      "Do not accept arbitrary URLs. If fetching is required, allow-list exact destinations (scheme, host, port, path) and reject everything else.",
      "Resolve the hostname before connecting and block loopback, private, link-local and cloud-metadata ranges — and re-validate after every redirect.",
      "Disable redirect following for server-side fetches, or validate each hop.",
      "Egress-restrict the service (network policy / proxy) so it cannot reach internal networks or 169.254.169.254 in the first place.",
    ],
    references: [{ label: "OWASP SSRF prevention", url: "https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html" }],
  },

  SSRF_BLIND_OOB: {
    owasp: SSRF_API,
    cwe: "CWE-918",
    summary:
      "The server made a request to an attacker-controlled host without echoing the result. Even blind, this is enough to port-scan internal networks, reach metadata services and confirm internal hosts exist.",
    howProved:
      "An out-of-band callback address was injected into the captured parameters and the scanner received an interaction from the server's network position, confirming the fetch happened.",
    fix: [
      "Apply the same destination allow-list as in-band SSRF — blindness changes detection, not the fix.",
      "Block outbound traffic by default and route permitted egress through a proxy with a destination allow-list; alert on blocked attempts.",
      "Deny DNS resolution of internal names from application hosts where possible, and monitor for unusual outbound DNS.",
      "Treat any callback to an external host as an incident: review what the service can reach from its network position.",
    ],
    references: [{ label: "OWASP API7:2023", url: SSRF_API.url }],
  },

  COMMAND_INJECTION: {
    owasp: A03,
    cwe: "CWE-78",
    summary:
      "Shell metacharacters reached an operating-system command. An attacker can execute arbitrary commands with the service account's privileges — full host compromise in most deployments.",
    howProved:
      "Shell payloads were injected into the captured parameters and command output (e.g. `uid=…`, `/etc/passwd` content) was returned in the response.",
    fix: [
      "Remove the shell: call the underlying functionality through a library or an exec API that takes an argument array.",
      "If a binary must run, use a fixed allow-list of executables and pass each argument separately — never interpolate input into a command string.",
      "Run the service as an unprivileged user in a minimal sandbox/container with a read-only filesystem.",
      "Alert on unexpected child processes spawned by the service; treat this finding as an incident if it is reachable in production.",
    ],
    references: [
      { label: "OS command injection defence", url: "https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html" },
      { label: "CWE-78", url: "https://cwe.mitre.org/data/definitions/78.html" },
    ],
  },

  OPEN_REDIRECT: {
    owasp: A01,
    cwe: "CWE-601",
    summary:
      "A redirect parameter accepted an external destination, so attackers can send users from a link that appears to belong to your domain to a site they control (phishing, OAuth code theft).",
    howProved:
      "A scanner-controlled domain was injected into the captured redirect parameter and the response returned a 3xx whose `Location` header pointed at that domain.",
    fix: [
      "Redirect only to an allow-list of relative paths or named destinations; never echo a user-supplied absolute URL.",
      "If external redirects are genuinely required, parse the URL and compare the host against an explicit allow-list after normalisation.",
      "Reject protocol-relative (`//evil`), backslash and percent-encoded variants that bypass naive prefix checks.",
    ],
    references: [{ label: "CWE-601", url: "https://cwe.mitre.org/data/definitions/601.html" }],
  },

  EXPOSED_METRICS: {
    owasp: MISCONF_API,
    cwe: "CWE-200",
    summary:
      "The Prometheus/metrics endpoint is publicly reachable. It discloses internal service names, versions, request volumes, error rates and sometimes database or queue topology — a free map of your infrastructure.",
    howProved:
      "The metrics paths were requested and returned 200 with Prometheus exposition format (`# HELP`/`# TYPE` series) rather than an error.",
    fix: [
      "Bind the metrics listener to an internal interface (or a separate port with no public route) instead of the application's public listener.",
      "If it must stay on the public port, put it behind authentication and a network allow-list for the scraping host.",
      "Review the metric labels for secrets or high-cardinality identifiers (user ids, tokens, emails) that leak business data on their own.",
      "Add a deployment check that fails if the metrics path answers 200 from outside.",
    ],
    references: [
      { label: "OWASP API8:2023", url: MISCONF_API.url },
      { label: "CWE-200", url: "https://cwe.mitre.org/data/definitions/200.html" },
    ],
  },

  EXPOSED_SENSITIVE_PATHS: {
    owasp: MISCONF_API,
    cwe: "CWE-538",
    summary:
      "Files or directories that should never be public are reachable: directory listings, `.git`, `.env`, backups, logs and configuration exports. These hand over credentials and the full source history.",
    howProved:
      "Known sensitive paths were requested and returned 200 with content that should not be public (a directory listing, `[core]`/`repositoryformatversion` from `.git/config`, credential keys, or backup/config markers).",
    fix: [
      "Remove the files from the deployed web root — build artefacts, VCS metadata, backups, editors' swap files and `.env` must never be shipped.",
      "Disable directory auto-indexing on the web server and block dotfiles/dot-directories at the edge (nginx `location ~ /\\.` / equivalent).",
      "Move logs and exports out of the served directory into object storage with authenticated access.",
      "Add the exact paths found here to a CI/CD smoke test so they cannot reappear with the next deploy.",
    ],
    references: [
      { label: "CWE-538", url: "https://cwe.mitre.org/data/definitions/538.html" },
      { label: "OWASP WSTG: backup files", url: "https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/04-Review_Old_Backup_and_Unreferenced_Files_for_Sensitive_Information" },
    ],
  },

  SWAGGER_CHECK: {
    owasp: MISCONF_API,
    cwe: "CWE-200",
    summary:
      "API documentation is publicly served. It exposes the complete route table, parameter schemas, deprecated endpoints and internal naming — everything an attacker needs to enumerate your API without guessing.",
    howProved:
      "Common documentation paths were requested and returned 200 with Swagger/OpenAPI content rather than a 404.",
    fix: [
      "Publish API docs only on an internal host or behind authentication — they are developer tooling, not a public landing page.",
      "Disable documentation generation in production builds (`springdoc.api-docs.enabled=false`, `Swagger UI` off, etc.).",
      "Strip internal hostnames, admin-only routes and internal parameter names from any doc that must stay public.",
      "Review the docs you keep public for hidden or legacy endpoints that should be removed instead.",
    ],
    references: [
      { label: "OWASP API8:2023", url: MISCONF_API.url },
      { label: "OWASP API9:2023 (inventory)", url: `${API}/0xa9-improper-inventory-management/` },
    ],
  },

  CORS_MISCONFIGURATION: {
    owasp: MISCONF_API,
    cwe: "CWE-942",
    summary:
      "The API reflects an arbitrary `Origin` together with `Access-Control-Allow-Credentials: true`, so any website can read authenticated responses from a logged-in user's browser — a cross-origin data theft primitive.",
    howProved:
      "A probe Origin was sent and the response reflected it exactly in `Access-Control-Allow-Origin` with credentials allowed.",
    fix: [
      "Return `Access-Control-Allow-Origin` only for an explicit allow-list of trusted origins; never echo the request's Origin header.",
      "Never combine a wildcard or reflected origin with `Access-Control-Allow-Credentials: true`.",
      "Keep the CORS policy in one place (middleware/gateway) so every route inherits it, and cover it with a test.",
    ],
    references: [{ label: "CWE-942", url: "https://cwe.mitre.org/data/definitions/942.html" }],
  },

  DEFAULT_CREDENTIALS: {
    owasp: AUTH_API,
    cwe: "CWE-1392",
    summary:
      "An account with default or vendor-known credentials is active on the authentication endpoint. Anyone who finds the application can log in — no exploit required.",
    howProved:
      "A short list of default username/password pairs was submitted to the captured login endpoint; one returned a session/token with no failure markers.",
    fix: [
      "Disable or randomise default accounts before shipping; force a password change on first install rather than seeding a known value.",
      "Add the vendor default pairs to a CI check that fails the build if they authenticate against a deployed environment.",
      "Rate-limit and lock out the authentication endpoint so credential guessing is expensive.",
      "Require a second factor for administrative accounts.",
    ],
    references: [
      { label: "OWASP authentication cheat sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html" },
      { label: "CWE-1392", url: "https://cwe.mitre.org/data/definitions/1392.html" },
    ],
  },

  WEAK_CREDENTIALS_REUSE: {
    owasp: AUTH_API,
    cwe: "CWE-521",
    summary:
      "An account observed in real traffic accepted a weak, guessable password. Attackers do not need an exploit — ordinary credential guessing takes over the account.",
    howProved:
      "The captured login request was replayed with the account identifier seen in production and a short list of common passwords; one attempt returned a session with no failure markers.",
    fix: [
      "Force a password reset for the affected account, invalidate its existing sessions and tokens, and notify the owner.",
      "Enforce a length-first policy (≥12 characters) and reject passwords found in breach corpora at registration and reset.",
      "Add rate limiting plus progressive lockout/backoff per account and per source IP on the authentication endpoint.",
      "Offer/require a second factor for privileged roles, and monitor for successful logins from new geographies.",
    ],
    references: [
      { label: "OWASP CWE-521", url: "https://cwe.mitre.org/data/definitions/521.html" },
      { label: "OWASP authentication cheat sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html" },
    ],
  },
}

const COMMUNITY: VulnGuidance = {
  owasp: { id: "OWASP API Top 10", name: "OWASP API Security Top 10", url: `${API}/` },
  summary:
    "A community-provided template matched on this endpoint. Confirm the condition from the evidence below before deciding impact — community templates vary in precision.",
  howProved:
    "The captured request was replayed with the template's payload and the response matched the template's success condition.",
  fix: [
    "Reproduce the request below against a non-production copy and confirm the condition is real.",
    "Fix the underlying control (authorization, validation or configuration) rather than filtering the specific payload from the template.",
    REPRO_STEP,
  ],
}

const GENERIC: VulnGuidance = {
  owasp: { id: "OWASP API Top 10", name: "OWASP API Security Top 10", url: `${API}/` },
  summary:
    "The scanner confirmed an exploitable condition on this endpoint. Review the evidence below for the exact request and response before triaging.",
  howProved:
    "The scanner replayed the captured request with a test payload and matched the response against the test's success condition.",
  fix: [
    "Reproduce the request from the evidence below against a non-production copy.",
    "Fix the underlying control (authorization, validation or configuration) rather than filtering the specific payload.",
    REPRO_STEP,
  ],
}

export function guidanceFor(testType: string | undefined | null): VulnGuidance {
  if (!testType) return GENERIC
  const normalized = testType.toUpperCase()
  const direct = GUIDANCE[normalized]
  if (direct) return direct
  if (normalized.startsWith("COMMUNITY_")) return COMMUNITY
  return GENERIC
}

/**
 * Risk context shown beside a finding. These are analyst-style estimates for
 * the vulnerability class — not a per-finding CVSS computation — which is why
 * the UI labels the score as estimated. They exist so an operator can triage
 * without re-deriving "can this be exploited by an anonymous attacker?" from
 * first principles every time.
 */
export interface RiskContext {
  cvss: string
  attackComplexity: string
  privilegesRequired: string
  userInteraction: string
  dataExposed: string
  businessImpact: string
}

const RISK: Record<string, RiskContext> = {
  BOLA:                        { cvss: "9.1", attackComplexity: "Low",  privilegesRequired: "Low (any account)", userInteraction: "None",     dataExposed: "Other users' objects", businessImpact: "Critical" },
  BOLA_PARAMETER_POLLUTION:    { cvss: "8.1", attackComplexity: "Low",  privilegesRequired: "Low (any account)", userInteraction: "None",     dataExposed: "Other users' objects", businessImpact: "High" },
  BOLA_CHAINED_ENUMERATION:    { cvss: "8.2", attackComplexity: "Low",  privilegesRequired: "Low (any account)", userInteraction: "None",     dataExposed: "Object ids and data",  businessImpact: "High" },
  BFLA:                        { cvss: "8.1", attackComplexity: "Low",  privilegesRequired: "Low (any account)", userInteraction: "None",     dataExposed: "Privileged function",  businessImpact: "High" },
  BROKEN_USER_AUTH:            { cvss: "9.1", attackComplexity: "Low",  privilegesRequired: "None",              userInteraction: "None",     dataExposed: "Account data",         businessImpact: "Critical" },
  JWT_NONE_ALGO:               { cvss: "9.8", attackComplexity: "Low",  privilegesRequired: "None",              userInteraction: "None",     dataExposed: "Any identity",         businessImpact: "Critical" },
  JWT_INVALID_SIGNATURE:       { cvss: "9.8", attackComplexity: "Low",  privilegesRequired: "None",              userInteraction: "None",     dataExposed: "Any identity",         businessImpact: "Critical" },
  MASS_ASSIGNMENT:             { cvss: "8.1", attackComplexity: "Low",  privilegesRequired: "Low (any account)", userInteraction: "None",     dataExposed: "Own privileges",       businessImpact: "High" },
  DEFAULT_CREDENTIALS:         { cvss: "9.8", attackComplexity: "Low",  privilegesRequired: "None",              userInteraction: "None",     dataExposed: "The account",          businessImpact: "Critical" },
  WEAK_CREDENTIALS_REUSE:      { cvss: "8.8", attackComplexity: "Low",  privilegesRequired: "None",              userInteraction: "None",     dataExposed: "The account",          businessImpact: "High" },
  SQL_INJECTION:               { cvss: "9.8", attackComplexity: "Low",  privilegesRequired: "None",              userInteraction: "None",     dataExposed: "Database contents",    businessImpact: "Critical" },
  COMMAND_INJECTION:           { cvss: "9.8", attackComplexity: "Low",  privilegesRequired: "Low",               userInteraction: "None",     dataExposed: "Host / process",       businessImpact: "Critical" },
  REFLECTED_XSS:               { cvss: "6.1", attackComplexity: "Low",  privilegesRequired: "None",              userInteraction: "Required", dataExposed: "Victim session",       businessImpact: "Medium" },
  STORED_XSS:                  { cvss: "7.1", attackComplexity: "Low",  privilegesRequired: "Low",               userInteraction: "Required", dataExposed: "All viewers' sessions", businessImpact: "High" },
  SSRF:                        { cvss: "8.6", attackComplexity: "Low",  privilegesRequired: "Low",               userInteraction: "None",     dataExposed: "Internal services",    businessImpact: "High" },
  SSRF_BLIND_OOB:              { cvss: "7.5", attackComplexity: "Low",  privilegesRequired: "Low",               userInteraction: "None",     dataExposed: "Internal reachability", businessImpact: "High" },
  OPEN_REDIRECT:               { cvss: "4.7", attackComplexity: "Low",  privilegesRequired: "None",              userInteraction: "Required", dataExposed: "None directly",        businessImpact: "Low" },
  CORS_MISCONFIGURATION:       { cvss: "6.5", attackComplexity: "Low",  privilegesRequired: "None",              userInteraction: "Required", dataExposed: "Authenticated responses", businessImpact: "Medium" },
  EXPOSED_METRICS:             { cvss: "5.3", attackComplexity: "Low",  privilegesRequired: "None",              userInteraction: "None",     dataExposed: "Internal metadata",    businessImpact: "Medium" },
  EXPOSED_SENSITIVE_PATHS:     { cvss: "7.5", attackComplexity: "Low",  privilegesRequired: "None",              userInteraction: "None",     dataExposed: "Files and secrets",    businessImpact: "High" },
  SWAGGER_CHECK:               { cvss: "5.3", attackComplexity: "Low",  privilegesRequired: "None",              userInteraction: "None",     dataExposed: "Route inventory",      businessImpact: "Medium" },
}

export function riskContextFor(testType: string | undefined | null): RiskContext {
  if (!testType) return RISK.EXPOSED_METRICS
  return RISK[testType.toUpperCase()] ?? {
    cvss: "5.3", attackComplexity: "Low", privilegesRequired: "Unknown",
    userInteraction: "Unknown", dataExposed: "Unknown", businessImpact: "Medium",
  }
}


/** Human label for a test type, e.g. "jwt_none_algo" → "JWT None Algo". */
export function testTypeLabel(testType: string | undefined | null): string {
  if (!testType) return "Finding"
  return testType.replace(/_/g, " ")
}
