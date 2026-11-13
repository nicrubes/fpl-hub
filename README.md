# FPL Hub

A personal helper for one FPL Draft league. Every hour it:

1. pulls the public league data from the FPL Draft site (no login),
2. rebuilds a passcode-locked web page (best available players by draft rank, forced release, hidden picks, rivals, deadlines),
3. sends one reminder email per gameweek – 24 hours before waivers close, or 48 hours before in tight weeks – plus a redraft reminder.

The page is scrambled with AES-256 before it is published, so the site shows nothing without the passcode.

Settings live in `config.json`. Secrets (`FPL_PASSCODE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_TO`) live in the repository's Actions secrets, never in the code.

Local preview: `node build.js --preview` writes `preview/site.html` and `preview/email.html`.
