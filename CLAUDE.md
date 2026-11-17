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

## Challenge tab (part 3, built 17 Nov 2026)
- Code: `lib/challenge.js` (pick logic = "Nic's Challenge method", settings in `SET` at the top: change only with Nic's OK), `lib/challenge-data.js` (public FPL Challenge data + the game's page script, which holds each week's rule wording), `lib/challenge-rules.js` (wording → recipe), `lib/challenge-page.js` (tab), `lib/challenge-email.js`. Notes: `Notes\03 FPL Hub\Nic's Challenge method.md`.
- `build.js` runs it inside try/catch: a Challenge failure must never stop the Draft site or email. It reuses Draft data via `buildModel(...).raw`.
- The rule wording cache lives in `state.json` (`challengeCopy`); the big page script is only re-read when its file name changes. Nic's own rule (if he sets one on the site) is `data/challenge-rule.json` (not secret).
- Tabs: each tab is an element with `data-view` (`#app` = draft, `#chapp` = challenge) and a nav link with `data-tab`; the address hash picks the tab. Superbru should add its own `data-view="superbru"` element and nav link the same way.
- Never post to Reddit or enter the Challenge team automatically. The post is written by Nic's own Claude chat from the "Copy brief for Claude" button (no paid API). FPL Form numbers must not appear in the post.
- Tests: `node tools/test-challenge-rules.js` (every published rule read correctly), `node tools/test-challenge.js [gw]` (the six, optionally with another week's rule).
- FPL Challenge terms ban "automated systems"; Nic accepted that risk on 17 Nov 2026.

## Testing before saying it's done
1. `node build.js --preview` with `FPL_FORM_CSV` set to the Downloads CSV(s), and `FPL_PASSCODE` set to a throwaway test code to also get `preview/locked.html`.
2. Start the "fpl-hub-preview" server (`D:\Claude\.claude\launch.json`, port 5178) and check `site.html`, `email.html` and **`locked.html` with the test code typed into the real lock screen** (the page and lock screen once clashed and showed a blank page). Add `?v=N` to the address after a rebuild: the browser keeps old copies. Don't pipe `build.js` output into `Select-Object -First`: it stops the build before the files are written.
3. Check phone width (390px) and desktop width.
4. After publishing, run the workflow and read the "Build site" step log.
