# Pause That — Build Spec v1

What this is: the single source of truth for building the iOS app in Cursor. Read this before writing any screen. When this spec and the interactive mockup disagree, this spec wins, except on fine visual detail, where the mockup wins.

Working title: Pause That (internal codename: Toggle). Name not yet final. Do not hardcode the name in more places than the app title string and the icon label; it may change before launch.

Companion reference: the interactive web mockup (tappable). Keep it open beside Cursor while building. It shows every interaction described here.

How to use this in Cursor: this file lives at `docs/pause-that-build-spec.md` and is referenced from `.cursor/rules` so it stays in context. Build in the order given in section 10.

Spec v1, written from the interactive mockup and founder decisions, Sep 27, 2026. Update this file when a product law changes; it is the contract.

## 1. Product, in one paragraph

Pause That is an iOS-first app for in-the-moment mental agency. It presents the user's recurring mental patterns as phone settings style toggle switches. When a pattern is loud (overthinking, spiraling, self-criticism...), the user opens the app and turns that switch OFF. The app answers with one short, rotating line in the user's chosen voice, then gets out of the way. Turning a switch off means: "I am choosing not to engage with this right now." The app is not therapy, not journaling, not mood tracking, not meditation, and not an AI therapist. A successful interaction lasts seconds.

## 2. Non-negotiable product laws

These override any design instinct. If a feature conflicts with a law, the feature loses.

1. The worse the user feels, the less the app should ask from them. Every screen must be usable by someone mid-spiral with shaking hands.
2. No timers, ever visible. No duration picker, no countdown, no "back on in 30 minutes," no "Overthinking is back on" message. Switches are momentary: a switch turned off drifts back to rest when its response is dismissed. Rest means "available," never "loud."
3. No engagement mechanics. No streaks, no guilt notifications, no emotional scores, no distress dashboards, no badges, no "you've paused 12 times this week."
4. "That's enough" always ends the interaction. After a toggle-off, the follow-up offers at most three actions and always includes "That's enough." Tapping it closes everything with no further prompt, no guilt, no upsell, no "are you sure."
5. Laugh with the user, never at the user. The Unfiltered voice is dry, funny, blunt, occasionally profane. It is never cruel and never punches down at the person using the app.
6. No clinical claims. The app does not diagnose, treat, or imply treatment of any condition. Copy must never say "therapy," "treatment," "disorder," or promise outcomes like "reduce your anxiety."
7. Hold This never resurfaces on its own. A parked thought is stored quietly and shown again only if the user explicitly asks to see held thoughts.
8. Haptics reinforce, never carry. Every haptic has a visual twin. Never communicate meaning by vibration alone.

## 3. Design tokens

### 3a. Color (dark-first, candlelight palette)

The app is dark-first. These are the dark theme values, taken from the mockup. Light theme is deferred; do not build it in v1.

| Token | Hex | Usage |
|---|---|---|
| paper | `#0E0D0B` | App background |
| panel | `#151310` | Cards, sheets, rows |
| soft | `#24211D` | Pressed / secondary surfaces |
| ink | `#F4EADC` | Primary text (warm bone) |
| muted | `#AAA094` | Secondary text, captions |
| line | `#35302A` | Hairline borders (1pt, never shadows for separation) |
| accent | `#F0DFC3` | Candlelight cream. Primary accent: active states, key text highlights, primary buttons |
| accentInk | `#17120A` | Text drawn on top of accent |
| signal | `#F5A524` | Amber. RESERVED. Use only for the small "switch is off / released" glow moment. Never as a general accent, never in marketing copy inside the app. |

Rules: depth comes from hairline borders and surface tone steps, not drop shadows. A subtle film-grain texture sits over the background at very low opacity. Nothing here may look like stock iOS green toggles, purple/blue gradients, glassmorphism, or spa branding.

### 3b. Typography

Display: Space Grotesk (headlines, the wordmark, big numbers). Body: Inter (all reading text). Labels: JetBrains Mono (eyebrow labels like MIND ALERTS, captions, metadata). Bundle these fonts in the app. If a font fails to load, fall back to the system font at the same weight; never substitute a serif.

Why this pairing: Space Grotesk (geometric, slightly offbeat) reads as designed-not-corporate and carries the human warmth; Inter is psychologically invisible, which is exactly what body text should be when someone is distressed and trying to read; JetBrains Mono (technical, precise) creates the instrument-panel feeling that sells the switchboard metaphor. The tension between the quirky display face and the technical mono is what keeps the app from reading as generic wellness. Mono is rationed to true eyebrows only because overused monospace feels cold.

Enforce strict roles: Space Grotesk owns primary ideas and headlines, Inter handles all reading text and controls, JetBrains Mono is reserved for true eyebrow labels only. Cut redundant labels rather than stacking them. Body line-height stays generous (around 1.6) for a calm read, and each screen gets one big idea with whitespace around it. Nothing competes with the primary headline.

Type scale (iOS points): display 34/40 bold for screen titles, 20/26 semibold for section headers, 17/24 regular body, 13/18 regular secondary, 11/14 mono uppercase with 2pt tracking for eyebrow labels.

### 3c. Shape, spacing, iconography

Corner radius: 16–20pt cards, 12pt rows and buttons, fully rounded (pill) toggles and primary buttons. Touchpoints stay soft and familiar; the brutalist structure (hairlines, mono labels, grain) carries the distinctiveness, not the control shapes.

The switch is a familiar pill toggle with a sliding thumb and solid fill, iPhone Settings style, in our own palette: cream (`accent`) filled at rest (available, not loud), quiet warm gray while OFF. No mid-throw line, no invented slider track. Familiarity is the point: a distressed user never learns a new control.

Row height for switches: 64pt minimum touch target, generous padding.

The app icon and the in-app toggle glyph share one mark: a custom mid-throw toggle (a switch caught halfway between on and off). Draw it as a line icon. Never use a sun, horizon, lotus, or brain illustration.

Each mental-pattern switch gets its own small custom line icon (loop, spiral, dots, etc., per the mockup). Keep them abstract; no faces, no brains.

## 4. Screens and states

### 4a. Home: the switchboard

Layout from top to bottom:

1. Shutdown entry. A distinct, quiet row at the very top for "everything is too loud." It does not look like the other switches; it is an environment, not a toggle.
2. Pinned controls (compact): the user's most-used switches, one row.
3. MIND ALERTS group (eyebrow label, mono): Overthinking, Spiraling, Assuming, Replaying It, Self-Criticism, Thinking Worst Case, Rabbit Hole, Need to Know, Mental Noise.
4. BOUNDARIES group: Access, Savior Mode, Feeling Obligated.

A category filter sits above the groups: All / Mind Alerts / Boundaries chips (segmented control, no label needed). Tapping one narrows the visible switch rows; pinned shortcuts keep working across filtered views. This is recognition-based on purpose: no free-text search in v1, because search demands recall (remembering exact toggle names) at the moment recall is hardest, and a "no results" dead end tells a spiraling person their feeling "doesn't exist." If search is ever added, it needs a curated synonym map and a no-match state that suggests rather than rejects.

Each row: line icon, name, custom switch (always starts at rest). Switches are familiar pill toggles: cream filled at rest (available, not loud), quiet warm gray while OFF, with a sliding thumb.

Switch icons use the most universal metaphor for each pattern, all in one consistent rounded-stroke style (SF-Symbols-like weight, no filled/outline mix). Depict the pattern, not the solution:

- Overthinking: speech bubble with ellipsis
- Spiraling: clean single spiral
- Assuming: speech bubble with question mark
- Replaying It: circular replay arrows, well spaced
- Self-Criticism: speech bubble with small lightning bolt
- Thinking Worst Case: storm cloud
- Rabbit Hole: arrow descending into an ellipse
- Need to Know: magnifying glass
- Mental Noise: waveform bars
- Access: open door
- Savior Mode: life ring
- Feeling Obligated: chain link

### 4b. The toggle-off moment (the core interaction)

This is the product. Get this exactly right before building anything else.

The toggle is an instrument, not a mirror: it performs the act of setting a pattern down. It does not report the user's mental state, and the board never presumes what is loud right now.

1. User taps a switch to turn it OFF.
2. The switch animates over 400–800ms with a settling ease (ease-out, no spring bounce), plus a soft haptic. The row dims.
3. Inline, directly under the row label (no modal, no banner, no new screen), one response line fades in. The line is drawn from that switch's rotating pool: pick randomly, never repeat until the pool is exhausted, then reshuffle. The line renders with no quotation marks: it is the app speaking directly to the user, not quoted speech.
4. Below the line: "What do you need?" with at most three contextual actions. The actions depend on the switch (e.g. Words for me, Hold this, Words for them). One of the three is always "That's enough."
5. Tapping "That's enough" closes the inline block silently. No confirmation, no follow-up, no guilt.
6. The OFF state lives exactly as long as the inline response is visible. When the response is dismissed ("That's enough," a follow-up, or navigating away), the switch drifts back to rest with a gentle animation (instant under Reduce Motion). Rest means "available," not "loud." The user only ever moves a switch in one direction: ON to OFF. There is no visible timer and no "back on" messaging. Ever.

### 4c. Words for Me

One supportive line on screen, large and calm. One button: "Another one" (draws the next line, same no-repeat rule). No feed, no list, no history screen in v1.

### 4d. Words for Them

For moments when the user needs words for another person. Entry from switches tagged with the action (Assuming, Access, Savior Mode, Feeling Obligated in v1).

1. Header: "What do you need to say?"
2. Category tabs: Say no / Buy time / Set a boundary.
3. One script card at a time: short, natural, copyable. Buttons: Copy these words (copies to clipboard with a subtle confirmation) and Another one.
4. Reassurance line under the card, e.g. "No explanation is required."
5. Scripts must read like a real text message, not a corporate template. Never ask the user to type out a detailed story to get a script.

### 4e. Hold This

Cognitive offloading, not journaling. From a toggle-off, the user can park the looping thought: one text field, one save button, done. It is stored locally, shown nowhere unless the user explicitly opens held thoughts, and never resurfaces via notification or prompt. Release flow for held thoughts is undecided; for v1, viewing and deleting is enough.

### 4f. Shutdown

The escalation path for "everything is too loud." A separate, darker environment, entered from the top of Home.

Entry sequence: Threshold (a breath, a single line of text, one continue button) -> Sweep (the noise sources dim one by one, minimal interaction) -> Stillness (the resting state).

Stillness offers four sounds: Brown Noise, Rain, Ocean, Quiet (Quiet = true silence with the visual ambience kept).

Stillness visual: layered concentric rings animated as one very slow water ripple (roughly an 8 to 10 second cycle). No numbers, no labels, no instructions. It is ambience, not a breathing exercise, and must not read as a timer. Respect Reduce Motion: render the rings static.

No timers in Shutdown either. The user leaves when they leave.

### 4g. Widget

Lock screen / home screen widget concept: shows the user's pinned switch (or Shutdown) with one-tap toggle-off. Tapping it deep-links into the app at the inline response state. This is a v1 accelerator if cheap, else v1.1.

### 4h. Onboarding (first open)

Two screens, no account wall, no check-in, no mood score. Order matters:

Screen 1: voice picker (see 4i). The user must meet the voice choice before anything else, or the feature dies undiscovered. One tap: tapping a voice IS the choice, and it flows straight to screen 2. No confirm button. Never shown again except via Settings.

Screen 2: welcome.

- Eyebrow: "First open."
- Headline: "No check-in required."
- Prompt: "What's loud right now? You don't have to explain it. Pick the thought or pattern you want to stop engaging with."
- Primary action: "Show me the switches" (goes straight to the Home switchboard).
- Secondary: "Everything's loud" (deep-links into Shutdown).
- Footer reassurance: "No account wall. No mood score. You can change the voice later."

### 4i. Voice picker

Three voices: Soft, Straight, Unfiltered. "Voice" means written personality (tone of the copy), not audio. No scenario framing: a single scenario implies it is the app's whole scope.

Headline: "How do you want me to speak to you?"

Subline: "How you want to be talked to when your mind is loud. Some people need gentle. Some people need it straight. Pick the one that lands. You can change it anytime in settings."

Three cards, each with a descriptor and a sample line:

- Soft — "Gentle and warm. Like someone who gets it." Sample: "You're doing the best you can with a loud mind. That counts for a lot."
- Straight — "Plain and direct. No cushioning, no coldness." Sample: "This thought isn't useful. Set it down."
- Unfiltered — "Blunt, funny, swears like your best friend. Always in your corner." Sample: "Yeah, fuck that. This one's about you."

One-tap select: tapping a card sets the voice and advances. No confirm step. The "swears like your best friend" descriptor is the content warning: slick, not robotic.

One voice applies app-wide in v1; per-scenario voice customization is reserved as a future paid unlock, not a v1 feature. The voice flavors Words for Me, Words for Them, and all response pools.

## 5. Motion and haptics

All motion: 400–800ms, ease-out, settling rather than bouncing.

Respect Reduce Motion: replace movement with crossfades, keep state changes instant and legible.

Haptics: one soft tap on toggle-off, one lighter tick on "That's enough." Haptics reinforce the visual; they never carry meaning alone (law 8).

## 6. Voice system

Soft: warm, gentle, older-sister energy. Never saccharine.

Straight: plain, direct, no cushioning. Not cold.

Unfiltered: dry, funny, blunt, occasionally profane. Rules: profanity is seasoning, never the meal. Never cruel, never aimed at the user. "Their disappointment is not your fucking emergency" is the calibration line: the anger points outward at the pressure, never inward at the user.

Across all voices: short lines, plain words, no therapy jargon, no "journey" language, no em dashes in user-facing copy.

## 7. Response copy pools (v1, canonical)

Pools rotate per switch with no repeats until exhausted (4b.3). These are the shipped lines; do not paraphrase them into "better" versions without founder approval. Add new lines only in the same spirit: short, concrete, a little funny, never clinical.

Overthinking (actions: Words for me, Hold this)

- We have held enough imaginary meetings about this. Adjourned.
- You do not need to solve this right now.
- If another hour of thinking fixed it, we would be done already.
- This can stay unanswered.

Spiraling (actions: Words for me)

- Not every thought deserves a full production.
- The spiral does not get the whole damn evening.
- One thing is true: you can stop here.
- No more laps around the same fear.

Assuming (actions: Words for me, Words for them)

- We do not have enough evidence for this courtroom.
- A guess in a trench coat is still a guess.
- You can wait for actual information.
- Your brain is writing dialogue for people who are not here.

Replaying It (actions: Words for me, Hold this)

- The scene does not change on the forty-third replay.
- We saw it. We hated it. Roll credits.
- You do not have to edit the past tonight.
- This rerun has been cancelled.

Self-Criticism (actions: Words for me)

- You are not required to bully yourself into being better.
- That voice is loud, not correct.
- You get to be a person, not a performance review.
- Babe, we are not punching down at ourselves today.

Thinking Worst Case (actions: Words for me, Hold this)

- Possible is not the same thing as happening.
- Your brain skipped the trailer and wrote the disaster ending.
- We are not rehearsing grief for an event that has not occurred.
- No need to pre-suffer.

Rabbit Hole (actions: Words for me)

- The internet does not have the certainty you came here for.
- Close the tabs, including the ones in your head.
- More information is not always more clarity.
- You have dug far enough for tonight.

Need to Know (actions: Words for me, Hold this)

- You can survive not knowing yet.
- The answer is not available. You are still allowed to rest.
- Uncertainty is uncomfortable, not an emergency.
- Leave the detective board alone for now.

Mental Noise (actions: Words for me)

- Nothing needs to be organized this second.
- Let the radio play in another room.
- The noise can exist without getting a response.
- No minutes. No agenda. Just less.

Access (actions: Words for me, Words for them)

- Being reachable is not the same as being available.
- You are allowed to close the door without a speech.
- Nobody is owed immediate access to you.
- Unavailable is a complete status.

Savior Mode (actions: Words for me, Words for them)

- Support is not the same as rescue.
- You can care without taking over.
- Their emergency does not automatically become your assignment.
- Put the cape down. It needs a wash anyway.

Feeling Obligated (actions: Words for me, Words for them)

- Their disappointment is not your fucking emergency.
- A request is not a command.
- You can say no without managing their reaction for them.
- Guilt is not proof that you did something wrong.

Note: every pool ships in three voice variants in v1 (Soft, Straight, Unfiltered). Rotation happens within the user's chosen voice. The voice picker would be decorative otherwise. The voice setting is stored as user preference.

## 8. Data model (local-first sketch)

Keep it boring and local-first. No account, no backend in v1. The native-ios branch is Capacitor, not SwiftUI. Persist with Capacitor Preferences. The shape below is the model, not a SwiftData requirement.

- MentalSwitch: id, name, iconName, group (mindAlerts/boundaries), isPinned, sortOrder. Switch state is never persisted: the OFF state exists only while its inline response is on screen.
- SwitchResponse: id, switchId, text, timesShown, lastShownAt. Rotation logic: least-recently-shown first, reshuffle when all shown.
- VoiceSetting: currentVoice (soft/straight/unfiltered). One row.
- HeldThought: id, text, createdAt, switchId (optional). Never surfaced except on explicit request. No notifications touch this table.
- ShutdownSession: id, startedAt, endedAt, soundUsed. For nothing except not being stupid later; do not build stats on it in v1.

Everything stays on device. If iCloud sync is added later, HeldThought syncs only with explicit user opt-in.

Identity: no custom accounts, ever in v1. There is no email signup, no password, no auth server. Apple already gives the app an identity layer for free:

- The one-time unlock is a StoreKit non-consumable tied to the user's Apple ID. It restores on new devices via the App Store-required "Restore Purchases" button. No account needed to prove they paid.
- Cross-device settings sync rides on iCloud (Apple ID): the voice setting and pinned switches sync silently for users signed into iCloud. No login screen, no password reset flow to build or secure.
- HeldThought sync, if added, uses the CloudKit private database: encrypted, Apple cannot read it, and it only moves with explicit opt-in. Building custom auth would add signup walls (violating the no-account-wall law), password-reset liability, and App Store account-deletion obligations, all to solve a problem Apple already solved. The privacy story becomes a selling point: "Your thoughts never touch our servers, because we don't have any."

## 9. Monetization (for later, not v1 UI)

One-time full unlock, no subscription. Target around $19.99. The free tier must be genuinely complete (the full switchboard and core loop are free). Pay for depth, customization, and ownership: extra custom switches, more voices/packs, widget themes, Shutdown sound packs. Do not build the paywall until the core loop feels perfect.

## 10. Build order for Cursor

Canonical stack (locked Sep 27, 2026): the native-ios branch is a Capacitor app, a native iOS shell around the web app in `www/`, with Capacitor plugins for haptics, preferences, and native audio. It is not SwiftUI. Build everything below as web components and CSS in `www/`; reach for native plugins only for haptics, persistence, and audio.

1. Design tokens as CSS custom properties in `www/`: colors, fonts, spacing, radii (section 3). The app cannot look right until this exists; do not build screens first.
2. The toggle as a reusable web component: familiar pill, cream-filled at rest (rest means available, not loud), quiet warm gray while OFF, sliding thumb, momentary return to rest when the response is dismissed, haptic via the Capacitor haptics plugin, Reduce Motion path.
3. The inline response row: dim, expand, rotating line, "What do you need?" with max three actions including "That's enough."
4. Home switchboard with the 12 switches in their two groups.
5. Words for Me, then Words for Them, then Hold This.
6. Shutdown (Threshold -> Sweep -> Stillness + four sounds, no timers).
7. Voice picker and settings.
8. Onboarding (last; it is two screens and depends on nothing).
9. Widget, if cheap; otherwise v1.1.

Build vertically: one switch end-to-end (Overthinking: toggle, response, "What do you need?", That's enough, return to rest) before cloning to twelve.

Note: the repo's native-ios branch previously contained a timer-based design (durations, wall-clock expirations, timer tests, duration-based Shutdown). That direction was superseded on Sep 27, 2026. See the Sep 27 repo rework brief for the removal checklist Cursor must execute before new work begins.

## 11. Explicitly out of scope for v1

Visible timers or countdowns of any kind. Streaks, scores, dashboards. Push notifications (none in v1, including no "come back" nudges). Accounts or backend. AI-generated responses at runtime (all copy is curated). Apple Watch, Android. Light theme. The "I need more than this" crisis resource path is an open product decision; do not improvise it, flag it to the founder.
