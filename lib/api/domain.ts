/**
 * Domain restriction utility.
 *
 * Reads ALLOWED_EMAIL_DOMAIN from .env.
 *
 * Values:
 *   ALLOWED_EMAIL_DOMAIN=iitrpr.ac.in   → only @iitrpr.ac.in allowed
 *   ALLOWED_EMAIL_DOMAIN=*              → ALL domains allowed (testing mode)
 *   (not set)                           → ALL domains allowed (testing mode)
 */

export function getAllowedDomain(): string | null {
    const domain = process.env.ALLOWED_EMAIL_DOMAIN?.trim();
    if (!domain || domain === "*") return null; // unrestricted
    return domain;
}

/** Returns true if the email passes the domain check. */
export function isEmailAllowed(email: string): boolean {
    const domain = getAllowedDomain();
    if (!domain) return true; // unrestricted
    return email.toLowerCase().endsWith(`@${domain}`);
}

/** Error message to show when domain check fails. */
export function domainErrorMessage(): string {
    const domain = getAllowedDomain();
    return domain
        ? `Only @${domain} email addresses are allowed`
        : "Invalid email address";
}

/** The hd (hosted domain) hint for Google OAuth — undefined when unrestricted. */
export function googleHdHint(): string | undefined {
    return getAllowedDomain() ?? undefined;
}
