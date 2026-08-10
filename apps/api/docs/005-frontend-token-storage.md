# ADR-005: Frontend Token Storage and Security Strategy

### Status
Accepted

### Context
In the Instascope architecture, authentication relies on short-lived JWT Access Tokens (e.g., 15 minutes) and long-lived Refresh Tokens (e.g., 7 days). We need to determine a secure client-side storage strategy for these tokens that minimizes vulnerability to Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF) attacks.

### Decision
We choose the **Memory Storage for Access Tokens + HttpOnly Secure Cookie for Refresh Tokens** pattern:
* **Access Token**: Stored strictly in application memory (e.g., React state or a closure/service variable). It is never written to `localStorage` or `sessionStorage`.
* **Refresh Token**: Stored in an `httpOnly`, `secure`, and `SameSite=Strict` cookie managed by the backend. JavaScript cannot access this cookie, neutralizing direct client-side script theft.

---

### XSS and Threat Analysis Discussion

#### 1. Vulnerability to XSS (Cross-Site Scripting)
* **Risk with `localStorage`**: If an attacker injects malicious JavaScript via an XSS vulnerability, any script running in the browser can execute `localStorage.getItem('accessToken')` and exfiltrate credentials to an external server.
* **Mitigation with Memory Storage**: By keeping the Access Token inside volatile runtime memory, an XSS payload cannot easily read or dump it via standard storage APIs. Even if XSS occurs, the attacker's window of opportunity is limited, and they cannot persist access beyond the current session lifecycle without stealing the refresh mechanism. Because the Refresh Token is locked inside an `httpOnly` cookie, JavaScript cannot read or modify it whatsoever.

#### 2. Vulnerability to CSRF (Cross-Site Request Forgery)
* **Risk with Cookies**: Browser cookies are automatically attached to cross-origin requests, opening vectors for CSRF if not properly restricted.
* **Mitigation**: 
  * Setting the refresh cookie with `SameSite=Strict` (or `Lax`) ensures the browser does not send the cookie along with cross-site requests.
  * Explicit API routes for token refresh enforce strict CORS policies and validation headers.

### Consequences
* **Pros**: High resilience against token theft via XSS; clean separation of concerns where sensitive long-lived tokens are shielded from client-side script inspection.
* **Cons**: Page reloads or hard navigation clear the in-memory Access Token, requiring a silent token refresh via the secure cookie mechanism upon application bootstrap.