# Toggle — Native v1 Product Scope

Status: Locked scope for Native v1
Platform: iPhone (iOS), distributed via TestFlight, then the App Store
Origin: Native migration of the "Mel's Mind" PWA

This is a product scope document. It defines *what* Native v1 includes and excludes. It is not an engineering implementation plan. Anything not listed under "Confirmed for v1" is not part of v1 unless this document is updated.

---

## 1. Confirmed for v1

### Core existing experience

- **12 existing switches**, grouped as they are today:
  - **Mind Alerts (9):** Overthinking, Spiraling, Assuming, Replaying It, Self-Criticism, Thinking Worst Case, Rabbit Hole, Need to Know, Mental Noise
  - **Boundaries (3):** Access, Savior Mode, Feeling Obligated
- **Contextual reassurance message** shown when a switch is turned off, using each switch's existing message.
- **Manual re-enable:** the user can turn a switch back on at any time, which ends its temporary "off" period.
- **System light/dark mode:** the app follows the iPhone's appearance setting.

### Native v1 upgrades

- **Native iPhone haptics** on meaningful interactions.
- **Persistent wall-clock timers:** a switch's temporary "off" period stays correct if the app is backgrounded, closed, or relaunched.
- **Selectable temporary durations**, initially:
  - 2 minutes
  - 5 minutes
  - 15 minutes
  - 30 minutes
- **Favorites / Quick Access** for the switches a user relies on most.
- **Create Your Own Switch**, with:
  - custom name
  - custom supportive message
  - custom icon
  - custom duration
- **Local persistence, no account required.** All user data (preferences, favorites, custom switches, active timers) stays on the device.
- **Home Screen widget / quick access.**
- **Accessibility polish:** proper switch semantics, correct VoiceOver labels and state announcements, and sensible focus order.
- **Native iPhone polish:** safe areas, scrolling behavior, launch behavior, and the final App Store icon.
- **Rebrand from "Mel's Mind" to "Toggle"** across all user-visible text, metadata, and assets.

### Open questions within confirmed features

These features are confirmed. The details below still need an answer, but they do not change the scope.

- How a user chooses a duration (per switch, globally, or at the moment of turning off).
- Whether the built-in switches can be edited, hidden, or reordered.
- What "custom icon" means (emoji, a curated symbol set, or something else).
- Which switches and actions the widget exposes.
- The final App Store icon artwork (the current artwork has baked-in rounded corners and a border, which iOS will double-mask).

---

## 2. Requires design decision before implementation

### Tune Out Mode

- **Intent:** one deliberate action that creates an immersive calming or focus state.
- **Planned direction:** white noise, frequencies, or other calming audio.
- **Not yet decided:** the exact interaction design, entry and exit behavior, visuals, audio content, duration, and how it relates to the switches.
- **Status:** this document intentionally does not define its UX. **It needs a separate product and design decision before any implementation starts.**
- **Release impact:** before TestFlight, decide whether Tune Out Mode is in the v1 build or deferred. It must not block the confirmed v1 features.

---

## 3. Nice-to-have if low-cost

To be considered only after the confirmed v1 features are stable.

- **Shortcuts / App Intents / Siri integration**, for example turning a switch off from Shortcuts or Siri.

---

## 4. Post-launch

Not required for v1.

- **Apple Watch app.**

---

## 5. Explicitly out of scope

v1 must not expand into any of the following:

- Social features
- Accounts or cloud profiles
- AI therapist or AI coaching
- A journaling system
- Mood tracking
- Streaks or gamification
- Complicated analytics
- Medical claims, whether in the app, the App Store listing, or marketing
- Large onboarding flows

---

## Release Definition

### Ready for TestFlight when

- All "Confirmed for v1" features work on a real iPhone, not just the simulator.
- The rebrand to "Toggle" is complete, with no remaining user-visible "Mel's Mind" text.
- Timers stay correct after backgrounding, force-quitting, and relaunching.
- Favorites, custom switches, and active timers persist across relaunches.
- Light and dark mode both look correct.
- A basic VoiceOver pass has been completed on the main screen.
- Safe areas are correct on current iPhone sizes, including Dynamic Island devices.
- The final app icon is in place.
- There is a decision on whether Tune Out Mode is in or out of this build.
- There are no known crashes or data-loss bugs.
- The build is signed with the Apple Developer account and uploaded to App Store Connect under bundle ID `com.originallight.toggle`.

### Ready for App Store submission when

- Everything under "Ready for TestFlight" is true.
- TestFlight feedback has been reviewed, and any blocking issues are fixed.
- The App Store listing is complete: name, subtitle, description, keywords, screenshots, support URL, and privacy policy URL.
- The listing and in-app copy make no medical or therapeutic claims.
- The App Privacy details accurately reflect local-only data with no account.
- The age rating questionnaire is completed.
- The app offers clear native value beyond a wrapped website, including haptics, persistence, widget, and custom switches. This supports App Store Guideline 4.2 (Minimum Functionality).
- Any feature not finished is removed or hidden from the release build, not shipped half-complete.
