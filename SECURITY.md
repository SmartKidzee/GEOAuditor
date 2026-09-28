# Security Policy

## Supported Versions

Security updates are applied to the active development branch of GEOAuditor.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | Yes                |
| < 1.0   | No                 |

## Reporting a Vulnerability

The GEOAuditor development team takes security and privacy seriously, particularly regarding API credential handling and web scraping safety boundaries.

If you discover a security vulnerability in this project:

1. **Do not open a public issue.** Public disclosure puts users and deployments at risk before a fix can be made available.
2. Send a detailed vulnerability report via email to the project maintainers or use GitHub's Private Vulnerability Reporting feature under the repository's "Security" tab.
3. Include the following details in your report:
   * Description of the vulnerability and its potential impact.
   * Step-by-step instructions or minimal proof of concept to reproduce the issue.
   * Specific versions, operating systems, and environments affected.
   * Suggested remediation steps, if known.

## Vulnerability Handling Process

1. **Acknowledgment**: The maintainers will acknowledge receipt of your report within 48 hours.
2. **Assessment**: The issue will be triaged and investigated to determine severity and impact.
3. **Remediation**: A fix will be developed in a private security advisory branch and validated against existing test suites.
4. **Disclosure**: Once the fix is merged and released, a coordinated public disclosure will be published with credit to the reporter.

## Best Practices for Deployments

* **API Keys**: Never commit `backend/.env` containing your `GEMINI_API_KEY` to public version control. The repository's `.gitignore` explicitly excludes all local environment files.
* **Network Isolation**: When deploying backend services publicly, configure CORS origins to permit only authorized frontend domains.
* **Rate Limiting**: When hosting public audit instances, enforce upstream reverse proxy rate limiting to prevent denial-of-service against crawler endpoints.
