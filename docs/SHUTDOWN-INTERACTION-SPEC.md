# Shutdown — Interaction and Sensory Spec

Status: Canonical product and interaction spec for Native v1
Platform: iPhone (iOS)
App name in this build: Toggle

This is a product, interaction, and sensory design spec. It defines what Shutdown is, how it should feel, and what must be true before it ships. It is not an implementation plan. It does not prescribe code structure, audio engines, or native configuration beyond the behavior the user should experience.

A later public name, such as "Pause That", is out of scope here. This document does not rebrand the app.

---

## 1. Feature name and core purpose

**Name:** Shutdown

**Primary entry copy:**

> Shutdown
> Shut it all off.

Shutdown is for the moment when the user does not want to pause one specific mental pattern. They want the whole experience around them to become quieter for a while.

**Core principle:**

- "This thought is bothering me" → Pause it.
- "Everything is bothering me" → Shutdown.

Shutdown is a temporary immersive sensory environment. It is intentionally low-demand.

It is not therapy, meditation, a productivity or focus timer, or a gamified wellness experience.

The experience should require as little decision-making as possible.

---

## 2. Default entry behavior

Tapping Shutdown begins the mode immediately. There is no setup form and no confirmation screen before entry.

**First-use defaults:**

- Duration: 20 minutes
- Ambient sound: Brown Noise
- Transition style: Immersive

**Later sessions** may locally remember and reuse:

- last-used duration
- last-used ambient sound
- chosen transition style

Those remembered choices become the next session's defaults. The user is not asked to confirm them.

---

## 3. Sensory transition: entry

Entering Shutdown is a signature product moment. It should feel like crossing a threshold into another acoustic space.

**Sequence:**

1. The user taps Shutdown.
2. The normal UI begins to recede and dim.
3. A longer, crafted haptic sequence begins.
4. A subtle water- or ocean-inspired entrance sound creates the sense of crossing into the space.
5. A spatial audio Sweep travels through the stereo field.
6. Haptic, sound, and visual transition stay in sync.
7. The sensory motion gradually settles.
8. The environment arrives at stillness.

The water sound should feel subtle and tidal: a wash, a swell, a pull, or a passing wave. It should not sound like a cheesy stock ocean recording, and it should not be loud or dramatic.

Internally, the transition may be thought of as:

**Threshold → Sweep → Stillness**

The whole transition should feel deliberate and cinematic without becoming stimulating.

---

## 4. Spatial Sweep

The Spatial Sweep is a signature of Shutdown. The desired sensation is not simply audio panning from left to right.

The intended feeling is closer to:

**left → center of the head → right → deeper / back → dissolve**

The sound should feel as though it moves through and around the listener, then clears space and settles.

The sweep may use techniques such as:

- stereo movement
- binaural or spatial positioning
- subtle binaural-beat layering, where appropriate
- filtering and EQ changes
- depth cues
- stereo delay
- room and spatial cues
- changing brightness and depth as the sound moves
- layered brown-noise or tonal textures

Binaural beats are not the feature. The broader goal is a sonic environment with depth that breathes around you.

The first 8–15 seconds may contain the most noticeable spatial movement. After that, stimulation should drop significantly. Obvious left-right motion must not keep running for the whole session.

---

## 5. Ambient sound bed

**Initial v1 sounds:**

- Brown Noise
- Rain
- Ocean
- Quiet

After the entry transition, the chosen sound becomes the dominant environment.

The ambient sound should be continuous and low-demand. It should avoid obvious looping artifacts, sharp transients, and sudden volume changes. It should feel spacious where that suits the sound.

The environment may contain extremely subtle long-term spatial drift or "breathing." That drift should be barely noticeable and never distracting.

---

## 6. Active Shutdown visual experience

**Direction:** sensory reset and stripped-down first; cinematic and atmospheric second.

The active environment should feel near-black, deep charcoal or midnight, spacious, low contrast, quiet, and almost empty.

Possible visual behavior:

- extremely slow atmospheric light
- faint haze
- barely perceptible depth
- subtle refraction or water-like movement
- sparse particles, only if they stay non-distracting

Do not use bright gradients, generic meditation visuals, progress rings, floating motivational quotes, busy particle systems, gamified visuals, or productivity aesthetics.

The visual environment should become even calmer after the first few seconds.

**Reduce Motion:** if iOS Reduce Motion is on, substantially reduce or remove environmental motion and keep a calm static composition.

---

## 7. Active session UI

Once Shutdown is active, the regular app UI is gone. What remains should be minimal.

Show only what is genuinely necessary, such as:

- remaining time, presented subtly
- the current sound name
- a restrained way to change Sound
- a restrained way to change Time
- End Shutdown

Do not show progress rings, streaks, points, achievements, breathing prompts, journal prompts, motivational copy, or statistics.

The user should be able to stay in the environment without being asked to do anything.

---

## 8. Session duration

**Initial v1 choices:**

- 10 minutes
- 20 minutes
- 30 minutes
- 60 minutes

**First-use default:** 20 minutes.

Changing the duration while Shutdown is active should be possible through a low-prominence control. The exact control can stay a design decision, but it must stay simple.

---

## 9. Persistence and wall-clock behavior

Shutdown timing uses an absolute wall-clock end time, in the same spirit as the app's durable switch timers.

If the app is backgrounded, suspended, force-quit, or relaunched, and the end time is still in the future, Shutdown restores with the correct remaining time.

If the session has already expired, the app returns to the normal main interface. No stale session stays active.

The mode must not depend on an in-memory timer being allowed to run while iOS suspends the app.

---

## 10. Background audio

For Native v1, Shutdown audio continues when the iPhone screen is locked and when the app is backgrounded, unless the user has manually ended the session.

The user should not need to keep the screen lit to remain inside Shutdown.

How the app is allowed to play in the background is an implementation concern. This spec only requires the behavior.

---

## 11. Haptic language

Shutdown has its own tactile language.

Existing switch haptics stay as they are:

- Pausing a switch: medium impact
- Manually restoring a switch: light impact

Shutdown entry does not use a single ordinary impact. The entry haptic should be longer, crafted, and synchronized with the visual and audio transition. It should feel like descending or entering a zone.

**Conceptual feel:** medium → deeper / heavier → a soft trailing tactile event.

The exact envelope can later use the best available iOS haptic approach. That may include Core Haptics if a simpler impact cannot produce the sensation. This spec does not require a specific API.

The haptic stays in sync with the Spatial Sweep:

- tactile onset begins as the UI recedes
- tactile intensity and depth correspond to the sound moving into the central, deeper spatial position
- the tactile sensation disappears as the Sweep settles into the ambient environment

**Manual End Shutdown:** light haptic.

**Automatic session expiry:** no haptic.

**Background reconciliation:** no haptic.

---

## 12. Exit transition

Manual exit should feel like gently returning from the space.

**Concept:**

- the ambient sound softens
- a quieter reverse water or tidal wash may play
- a light haptic
- the atmospheric environment recedes
- the normal app UI returns

The exit is shorter and gentler than the entry.

Automatic expiry should not create a startling sensory event.

If the session expires while the app is inactive, the user simply finds the normal app the next time they open it.

---

## 13. Sensory accessibility and transition presets

Shutdown must work for people with different sensory tolerances.

**Default transition style:** Immersive

**Three presets, in ordinary language:**

### Immersive

- full spatial Sweep
- synchronized crafted haptics
- entrance and exit water wash
- atmospheric visual movement

### Gentle

- simpler stereo movement and a reduced Sweep
- lighter haptic treatment
- reduced visual motion
- softer entrance and exit

### Minimal

- no spatial Sweep
- no elaborate entrance transition
- a simple audio fade
- minimal or no motion
- a simple haptic, or none, depending on the user's haptic preference

The chosen style is stored on the device. A user who changes from Immersive to Gentle or Minimal stays on that choice until they change it again.

Shutdown must never later surprise the user with a stronger sensory intensity than the one they selected.

---

## 14. Haptic and motion settings

Separate user preferences:

- **Haptics:** On or Off
- **Motion:** follow iOS Reduce Motion automatically

Do not ask users to understand binaural, HRTF, DSP, or spatialization. Those are design and implementation ideas, not required on-screen vocabulary. The transition presets should describe the experience in normal language.

---

## 15. Headphones and speakers

The richest Spatial Sweep is expected through headphones or AirPods. Shutdown must still work through the iPhone speaker.

Do not claim the speaker experience matches headphone spatial or binaural listening. Do not require headphones to start Shutdown.

If headphone-specific behavior is shown later, it should be subtle and must not block entry.

---

## 16. Optional binaural techniques

Binaural-beat techniques may be explored as one layer of the sound design. They are not the identity of Shutdown.

Do not claim that binaural beats treat anxiety, clear the brain, reset the nervous system, change brainwaves in a medically meaningful way, or provide treatment.

An internal creative metaphor may be "sweep the noise out." Public and product language should stay experiential, not medical.

---

## 17. Copy

**Primary home entry:**

> Shutdown
> Shut it all off.

**Possible ephemeral line after the transition:**

> Everything can be quiet now.

If that line is used, it appears briefly and fades away. It does not remain as an affirmation card.

Do not add motivational or therapeutic copy without a separate product decision.

---

## 18. Out of scope for Shutdown v1

Do not include in the initial Shutdown implementation:

- automatically enabling iOS Focus or Do Not Disturb
- blocking other apps
- silencing system notifications
- controlling AirPods settings
- emergency contacts
- crisis workflows
- location sharing
- session streaks
- usage statistics
- achievements
- AI coaching
- breathing exercises
- journaling
- mood tracking
- therapeutic or medical claims

Any of these would be a separate future product decision.

---

## 19. Design principles

1. Low stimulation beats feature density.
2. The transition can be intricate. The active state should be simple.
3. Touch, sound, and visuals should feel like one coordinated sensory system.
4. The richer experience is the default, and sensory reduction must be easy.
5. The user should never be trapped in an effect they dislike.
6. The system should remember reduced-intensity preferences.
7. Automatic and background state changes should not create surprising haptics or sounds.
8. Shutdown should feel like a place or state, not a timer screen.
9. Small details should make the app feel considered and expensive.
10. Do not confuse sophistication with adding more controls.

---

## 20. Open design questions

These are unresolved on purpose. This spec does not choose answers for them.

- The exact sound design and audio assets for Brown Noise, Rain, Ocean, and the water threshold.
- The exact Spatial Sweep trajectory and timing.
- Whether subtle spatial drift happens during the ambient phase, and at what intensity.
- The exact haptic envelope, and whether Core Haptics is required.
- The exact visual atmospheric treatment.
- The exact placement of Sound, Time, and End Shutdown.
- Whether "Everything can be quiet now." is included in the final experience.
- Whether Shutdown later connects to iOS Focus, Shortcuts, or Lock Screen controls.
- Whether a future emergency or overwhelm feature is related to Shutdown or stays separate.

---

## 21. Release acceptance criteria

Shutdown is ready for Native v1 when all of the following are true:

- Entry starts immediately with sensible defaults.
- First-use settings are 20 minutes, Brown Noise, and Immersive.
- Session timing survives backgrounding and relaunch.
- Background audio works with the screen locked.
- Manual exit works cleanly.
- Automatic expiry never creates a startling event.
- Immersive, Gentle, and Minimal all work.
- Reduced sensory settings persist.
- iOS Reduce Motion is respected.
- Haptics can be turned off.
- Both headphone and speaker playback are usable.
- There are no therapeutic or medical claims.
- Shutdown can be ended at any time.
- Force-quit and relaunch do not lose or corrupt session state.
- The interaction has been tested on a physical iPhone before App Store submission.
