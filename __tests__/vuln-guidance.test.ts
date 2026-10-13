import { describe, expect, it } from "bun:test"
import { guidanceFor } from "@/lib/vuln-guidance"

// Every test type the backend registry ships. If a new test type is added and
// the UI falls back to the generic guidance, this fails — generic remediation
// text for every finding is exactly the complaint this guards against.
const REGISTERED_TEST_TYPES = [
  "BOLA", "BOLA_PARAMETER_POLLUTION", "BOLA_CHAINED_ENUMERATION", "BFLA",
  "BROKEN_USER_AUTH", "JWT_NONE_ALGO", "JWT_INVALID_SIGNATURE",
  "MASS_ASSIGNMENT", "DEFAULT_CREDENTIALS", "WEAK_CREDENTIALS_REUSE",
  "SQL_INJECTION", "REFLECTED_XSS", "STORED_XSS", "COMMAND_INJECTION",
  "SSRF", "SSRF_BLIND_OOB", "OPEN_REDIRECT", "CORS_MISCONFIGURATION",
  "EXPOSED_METRICS", "EXPOSED_SENSITIVE_PATHS", "SWAGGER_CHECK",
]

const GENERIC_FIX_MARKER = "Reproduce the request from the evidence below against a non-production copy."

describe("vulnerability guidance", () => {
  it("has vulnerability-specific remediation for every registered test type", () => {
    for (const testType of REGISTERED_TEST_TYPES) {
      const guidance = guidanceFor(testType)
      expect(guidance.fix.length).toBeGreaterThanOrEqual(3)
      expect(guidance.summary.length).toBeGreaterThan(40)
      expect(guidance.fix.join(" ")).not.toContain(GENERIC_FIX_MARKER)
    }
  })

  it("does not reuse the same remediation across distinct vulnerabilities", () => {
    const fixOf = (t: string) => guidanceFor(t).fix.join("|")
    const pairs: [string, string][] = [
      ["BOLA", "EXPOSED_METRICS"],
      ["BOLA", "BFLA"],
      ["JWT_NONE_ALGO", "JWT_INVALID_SIGNATURE"],
      ["EXPOSED_METRICS", "EXPOSED_SENSITIVE_PATHS"],
      ["EXPOSED_METRICS", "SWAGGER_CHECK"],
      ["REFLECTED_XSS", "STORED_XSS"],
      ["SSRF", "SSRF_BLIND_OOB"],
      ["DEFAULT_CREDENTIALS", "WEAK_CREDENTIALS_REUSE"],
      ["SQL_INJECTION", "COMMAND_INJECTION"],
      ["BOLA", "BOLA_PARAMETER_POLLUTION"],
    ]
    for (const [a, b] of pairs) {
      expect({ pair: `${a} vs ${b}`, same: fixOf(a) === fixOf(b) }).toEqual({ pair: `${a} vs ${b}`, same: false })
    }
  })

  it("maps each test type to an OWASP category and a linked URL", () => {
    for (const testType of REGISTERED_TEST_TYPES) {
      const guidance = guidanceFor(testType)
      expect(guidance.owasp.id.length).toBeGreaterThan(0)
      expect(guidance.owasp.url.startsWith("https://owasp.org")).toBe(true)
    }
  })

  it("falls back gracefully for community templates", () => {
    const community = guidanceFor("COMMUNITY_EXPOSED_CONFIG_FILES")
    expect(community.summary).toContain("community")
    expect(community.fix.length).toBeGreaterThanOrEqual(3)
  })
})
