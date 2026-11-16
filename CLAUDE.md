# FPL Hub – notes for Claude

Nic's FPL Draft helper. Full history: `D:\Claude\Notes\03 FPL Hub\Project summary.md`, `Plan.md`, `Weekly routine.md`, `Phone update summary.md`.

## Hard rules
- **Never save waiver claims between the waiver deadline and the gameweek deadline.** That's free agency on FPL Draft and moves go through instantly. Waiver Assist (`tools/waiver-assist-browser.js`) and the phone button (`lib/waiver-phone.js`) check the window before every click and stop 10 minutes before waivers close. Keep it that way.
- **Never write secrets into files or commits.** Passcode, Gmail app password and GitHub keys live in GitHub secrets (`FPL_PASSCODE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_TO`), in `%USERPROFILE%\.fplhub\settings.json` and in the phone's browser. Claude never types passwords or keys into websites; Nic does.
- **The GitHub project is public.** Only locked (encrypted) data goes in `data/`. FPL Form files must stay locked (their terms: personal use, no publishing).
- Don't automate Fantasy Football Hub (terms ban scripts). FPL Draft terms 12(d) risk was accepted by Nic on 16 Nov 2026.

## How this project is set up
- Plain Node.js, no npm packages. `build.js` runs hourly on GitHub Actions (`.github/workflows/hourly.yml`): pulls public FPL Draft data, reads the locked FPL Form files, builds the locked page (`lib/lock.js`, AES-256) and sends the email when due.
- **No git on the PC.** Publish by uploading changed files on github.com (`/upload/main/<folder>`) in Claude in Chrome (Nic is signed in there; the built-in browser isn't), or with the desktop key in `settings.json` via the GitHub API (ask Nic first). Then run the workflow from the Actions tab. Check GitHub's copy hasn't changed before overwriting (`state.json` is updated by the job itself, so don't upload it).
- Player matching: FPL Form uses main-game IDs; match to Draft players through `code` (`lib/predictions.js`).
- Scouting/waiver logic: `lib/scout.js` (approved by Nic; change it only with his OK).

## Testing before saying it's done
1. `node build.js --preview` with `FPL_FORM_CSV` set to the Downloads CSV(s), and `FPL_PASSCODE` set to a throwaway test code to also get `preview/locked.html`.
2. Start the "fpl-hub-preview" server (`D:\Claude\.claude\launch.json`, port 5178) and check `site.html`, `email.html` and **`locked.html` with the test code typed into the real lock screen** (the page and lock screen once clashed and showed a blank page).
3. Check phone width (390px) and desktop width.
4. After publishing, run the workflow and read the "Build site" step log.
