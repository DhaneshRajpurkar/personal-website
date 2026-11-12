# Site guide: how everything works and how to update it

Static multi-page portfolio, no build step. Hosted free on GitHub Pages.

| File | What it is |
|---|---|
| `index.html` | Home: opening scene → ring unlock → 3D lab hero → rotunda of 5 doors around the viewer |
| `elevator.js` | The elevator between the lab (top floor) and the rotunda (basement) |
| `lab.js` | The real-time 3D workshop behind the homepage headline (three.js) |
| `projects-data.js` | **Your project list — edit this to update the Projects page** |
| `projects.js` | Builds the Projects page and each project's detail page from `projects-data.js` (no need to touch) |
| `project.html` | The detail page template every project with a write-up uses |
| `reel.js` | The opening scene: starry night, page flips, hill → sketch of you, dive into the eye |
| `media/` | Sketch frames + hill silhouette used by the opening scene |
| `projects.html`, `achievements.html`, `resume.html`, `contact.html` | One page per door |
| `styles.css` | All styling (shared) |
| `site.js` | Rotunda camera (look, turn, walk-through), door locks, lock intro, theme toggle |
| `gesture.js` | Webcam + MediaPipe hand tracking, camera panel, drives the rotunda |
| `demo.js` | The animated two-hand unlock demonstration shown at the rotunda |
| `gesture-core.js` | The gesture rules themselves (steer, cross → spin → diamond); no camera code |
| `handcam.js` | The one shared camera + hand tracker every page uses |
| `handnav.js` | Hand navigation after unlocking: the shell that keeps the camera alive, cursor, pinch-click, scroll, swipe, fist |

To add a sixth door: copy one `<a class="door">` block in `index.html` (the arc re-centers itself automatically; lower `STEP` in `site.js` if doors start to overlap), copy a sub-page, and add it to the nav links on every sub-page.

## Opening scene
Starry night → a flipbook: ~50 pages flip superfast (~14 a second), each one a moment later: panning down the sky to a
valley, a dark hill, the hill becoming a pencil sketch of you, your head lifting until you look straight out → the
flipping stops; a small ring already sits on your iris → it glows for 1 s → the face zooms into the ring (the ring
rides on your iris and grows with it) → circuit traces charge the ring, the pupil opens, the screen splits to reveal
the site. About 6.7 s + 2.6 s. Plays once per visit; click or any key skips it; skipped with reduced motion on.

- `reel.js` draws the scene. The flipbook is the `pages` list; `T.glow` (1000 ms) and `T.dive` are the ring glow and zoom.
- `media/vf_00…vf_33` are the 34 head frames: your 4 photos plus in-between frames generated with optical flow
  (each pixel's motion between photos estimated, both photos warped toward the in-between moment, then blended).
  `sk_4a/sk_4b` are full-size drawings of the last pose for the zoom; `hill` is the silhouette.
- Your original photos are NOT part of the site files.
- The eye the camera dives into is found automatically: `find_eyes.py` (kept with your source photos, not on the site)
  detects your face and both eyes on the last pose, locates the iris, cross-checks it by mirroring the other eye, and
  saves the result to `media/eyes.js`. The zoom then steers so that point ends dead-centre, wherever the photo sits in
  the frame. If the eye file is missing or broken, it falls back to safe defaults instead of failing.

## The homepage lab (3D)
Behind the headline is a real-time 3D workshop: a concrete room with a glass wall onto an alien world at night (a
ringed gas giant in the sky, rock spires rising out of a sea of clouds), a workbench (PCB + code screens, oscilloscope, robot arm), a 3D printer and a hologram table with your
initials. The camera drifts slowly and looks toward the mouse.
- Uses three.js 0.160 loaded from the jsDelivr CDN. No internet / CDN blocked → a painted still background instead.
- It tunes itself: it starts at high quality, watches real frame times for ~1.5 s, and steps down (high → medium →
  low: less resolution, no glow, no floor reflection). If even "low" can't hold ~10 fps, it freezes on a still frame
  so slow laptops don't heat up. It also pauses when scrolled away, in a background tab, and drops to 24 fps when
  the mouse is still. The chosen level shows as `data-quality` on the `.lab-hero` element.
- To change the scene, edit `build()` in `lab.js`: positions are in metres (room is 16 wide × 14 deep × 5 high).

## The elevator
The homepage is one house: the lab is the top floor, the rotunda is the basement (B1). Scrolling, swiping, arrow /
Page keys, the ▼ / ▲ call buttons, or a hand flick/fist all take the elevator: the doors close (the ring from the
opening scene is split across them), the floor counter runs 3 → 2 → 1 → B1 while light from passing floors slides
through the seam, the cab settles, and the doors open onto the other floor. The first ride takes ~3.5 s, later
ones ~2.8 s. Timings are in `go()` in `elevator.js`; the look is the "the elevator" block in `styles.css`.
With reduced motion turned on it just jumps between floors.

## Resume viewer
`resume.html` shows `resume.pdf` in an interactive viewer (zoom, fit, full screen, drag, clickable links, download),
using PDF.js from cdnjs. To update your resume, replace `resume.pdf`; optionally also `media/resume-page.webp`
(a picture of page 1, shown while the viewer loads or when the page is opened straight from your computer).
The web copy has no phone number or email on purpose.

## The armory (basement)
Two armored suits stand in lit alcoves beside the Rotunda Doors (turn toward Projects or Contact to see them).
They are renders of your 3D model (ironman.3mf), saved as pictures in `media/armory/`; the model file itself is not part of the site (`suit-eva.webp`, `suit-lunar.webp`). To use your own
renders, save them with the same names, ideally a transparent-background PNG/WebP about 350×800 px, standing figure
centred.

## Updating your projects (no help needed)
Everything lives in `projects-data.js`; the top of that file is a step-by-step guide with a copy-paste TEMPLATE.
- Every project gets a card on `projects.html` and its own article at `project.html?p=<id>` (paragraphs, bullet
  lists, pictures with captions, side-by-side photos, a quote, a YouTube video, a gallery).
- Pictures go in `media/projects/<id>/`. The diagrams already there are SVG files you can open and edit in
  Figma, Inkscape or any text editor.
- Typos show up as a red box on the page naming the project and field to fix.
- On GitHub: upload photos into the folder, then edit `projects-data.js` with the ✏️ pencil and commit.

## The hand-gesture gate
The rotunda doors are sealed until the visitor unlocks them with their hands (once per browser visit):
- **Steer:** one open palm, move it left/right to face a door.
- **Unlock** (tuned from your own recording): ① **Separate**: wrists crossed close together, all fingers spread wide → ② **Moving**: swing hands around each other (≥100°) and pull them apart → ③ **Eye**: fingertips of both hands meet on top with thumbs below and an opening between; hold ~0.4 s. The faced door opens.

Tuning (all in `gesture-core.js`):
- `SEPARATE`, `MOVING`, `EYE` at the top hold every threshold (distances in hand-widths, times in ms).
- `STEP_TIMEOUT` — time allowed per step; `LOST_TIMEOUT` — how long both hands can drop out of view.
- Thresholds like `1.4 * s` are in hand-widths, so they work at any distance from the camera.

**Testing locally:** double-clicking `index.html` works. If your browser blocks the camera on local files, run a tiny local server instead:
`python -m http.server 8000` in this folder, then open http://localhost:8000. GitHub Pages is https, so it works there.

**Unlock demonstration** (`demo.js` + `media/demo-data.js`): the first time a visitor reaches the sealed rotunda,
two animated hands (your own recorded gesture from the Gesture Lab, trimmed, smoothed and mirrored) show
Separate → Moving → Eye with step labels, twice (~10 s), then it closes itself. "▶ Watch how it's done" replays it;
"Try it: enable camera" turns the camera on. Once per visit; × / Esc / clicking outside closes it.

**After unlocking, hands drive the whole site** (mouse, keyboard and touch still work too):
- ☝ index pointing up = move the cursor · 🤏 pinch thumb + index = click
- 👉 index pointing left / right, held ~0.5 s = previous / next door (in the rotunda: turn). Fires once per point.
- ✌ index + middle up, then FLICK them: flick down = scroll down, flick up = scroll up. Each flick glides ~300 px and slows to a stop; flick again to keep going. To flick up, curl the two fingers at normal speed, then snap them straight. Moving your whole hand doesn't scroll. (Prefer phone-style, where flicking up scrolls down? Set `flickInvert: true` in `NAV`.)
- ✊ hold a fist ~0.7 s = back to the rotunda
- Two hands up are ignored for navigation, so doing the unlock never clicks anything by accident.
- It survives every page change (pages load inside a shell that keeps the camera on) and refreshes (the shell rebuilds and restarts the camera by itself). It lasts until the browser tab is closed, or until "Turn off hand control" in the corner dock.
- Light on the computer: the camera runs at 320×240, hands are checked ~20 times a second while one is in view, and
  ~3 times a second ("resting") after 1.5 s with no hand. Raising a hand wakes it within a fraction of a second.
  Rates are `ACTIVE_MS` / `SLEEP_MS` / `SLEEP_AFTER_MS` in `handcam.js`.
- Tuning knobs are in `NAV` in `gesture-core.js` (pinch distances, flick distance/speed, how flat/long a sideways point must be, hold times).
- On https (GitHub Pages) the browser remembers camera permission, so refreshes don't ask again. Opened as a local file, some browsers ask on every refresh.

**Gesture Lab** (`gesture-lab.html`): a dev tool that records your hand movement as point data (no video) so the recognizer can be tuned to your real gesture. It's not linked from the site, so you can skip uploading it to GitHub.

Limits to know: this is a showpiece, not security — anyone can open `projects.html` directly. Visitors without a camera, or who decline, can't open the doors on the homepage (the sub-pages are still reachable by URL).

## Before you publish — fill these in
Search the `.html` files for `TODO`:
- [ ] GitHub repo link for Thresher Shark Tag
- [ ] Confirm graduation year (currently "expected 2030")
- [ ] Optional: add NASA Space Apps / Nebius results once known

Review every project blurb — it's public, so only keep what you and your teammates are fine with showing.

## Deploy to GitHub Pages
1. Create a repo named exactly **`DhaneshRajpurkar.github.io`** (public).
2. Upload **all** the files in this folder (the `.html` files, `styles.css`, all the `.js` files — including `lab.js`, `projects-data.js`, `projects.js`, `demo.js` — and the `media` folder) plus `resume.pdf` to the repo root (Add file → Upload files → Commit).
3. Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)` → Save.
4. Wait ~1–2 min. Your site is live at `https://DhaneshRajpurkar.github.io`.

Updating later = edit the file on GitHub and commit; the site redeploys automatically.

## Optional: custom domain (~$10–12/yr)
Buy something like `dhaneshrajpurkar.com` (Cloudflare, Porkbun, Namecheap). In Settings → Pages → Custom domain, enter it, then add the DNS records GitHub shows you, and tick **Enforce HTTPS**.

## Make employers actually find it
- Put the URL in your LinkedIn "Website" field, GitHub profile, resume header, and email signature.
- Submit it in Google Search Console so it gets indexed faster.

## Hosting on Vercel at dhaneshr.com
The site is plain static files (no build step), so Vercel serves it as-is.
1. Put the files in a GitHub repo (any name), then in Vercel: Add New → Project → import that repo.
   Framework preset: **Other**. Build command: none. Output directory: leave as the repo root. Deploy.
2. Project → Settings → Domains → add `dhaneshr.com` (and `www.dhaneshr.com`, set to redirect to the main one).
3. If you bought the domain through Vercel, DNS is automatic. Otherwise, at your registrar add the DNS records
   Vercel shows on that Domains page (an A record for `@` and a CNAME for `www`). HTTPS is set up automatically.
4. Every push to the repo redeploys the site.
