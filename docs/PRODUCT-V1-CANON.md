# Toggle — Product v1 Canon

Status: Superseded on September 27, 2026 where it conflicts with `docs/pause-that-build-spec.md`.

Any duration, countdown, or Shutdown clock in this file is void. There are no timers in this product. The build spec wins.
Working name: Toggle
Possible later public name: Pause That (not decided, and not a rebrand of this build)
Platform: iPhone first

This document defines what Toggle is, how it should behave, and which earlier product decisions no longer apply. It is not an engineering plan, and it does not change the current app.

## How to read the docs

- **This file is the highest-level current product canon.**
- `docs/SHUTDOWN-INTERACTION-SPEC.md` remains authoritative for Shutdown: entry, sensory transition, durations, haptics, motion, and exit.
- `docs/NATIVE-V1-SCOPE.md` remains historical and still useful where it does not conflict with this file.
- **Where this file conflicts with an earlier product decision, this file wins.**

Shutdown duration, sound, and transition behavior are not superseded here. A normal switch and a Shutdown session are different things.

The current build may still show the older switch duration chooser, countdowns, and single reassurance lines. That is existing implementation, not the intended product. Do not treat this document as a claim that those screens have already been removed.

---

## 1. What Toggle is

Toggle is an in-the-moment agency tool.

It helps a person regain a sense of agency when they notice they are mentally caught in something, without requiring them to analyze themselves first.

It is designed to help someone get through the moment they are in.

**Internal principle:** the worse you feel, the less the app should ask from you.

Toggle is not:

- therapy
- journaling
- mood tracking
- a habit tracker
- a meditation library
- a streak or gamification product
- an AI therapist
- a diagnostic tool
- a mental-health scoring product

A session can be successful if it lasts only a few seconds.

---

## 2. The switch

The built-in switches stay the center of the product.

A switch means: **I am choosing not to engage with this right now.**

It does not mean:

- the thought is gone
- the user is booking the thought to come back
- the app has clinically stopped overthinking, anxiety, or anything else

**Intended tap:**

1. The switch goes to the paused / off state immediately.
2. No duration chooser appears.
3. No countdown appears.
4. The app does not ask how long to pause it.
5. No notification announces the reset.
6. After a hidden internal reset period, the switch quietly becomes available again.

An internal wall-clock timer may still exist so the pause survives backgrounding and relaunch. That timer is infrastructure. It is not the product.

The user should not see "paused for X minutes" as the main state of a switch.

**Superseded:** `docs/NATIVE-V1-SCOPE.md` confirmed selectable temporary durations of 2, 5, 15, and 30 minutes, and left open how the user would choose one. The later build made that choice a visible chooser at the moment of turning a switch off. That visible chooser, and any user-facing countdown for a normal switch, is no longer the intended experience. The same applies to a custom switch's user-facing custom duration. Shutdown's 10 / 20 / 30 / 60 minute choices stay as specified in the Shutdown spec.

Manual restore, if it remains, must not reintroduce a duration question. The exact gesture for turning a switch back on early is not restated here; the reset itself stays automatic and silent.

---

## 3. Visual and sensory reward

Haptics matter, and they must not be the only reward.

Each built-in switch should get a restrained visual release when it is paused.

Sequence:

1. The switch changes state.
2. The row becomes quieter.
3. The icon or motif subtly releases, unwinds, or stops.
4. The response appears.
5. The motion settles.

Target length: about 400–800 ms.

The feeling to aim for is "something just left the room."

Do not use confetti, points, trophies, badges, cartoon reward loops, or extra animation. Respect Reduce Motion. Custom switches may use one simpler generic release if they do not have their own motif.

---

## 4. Responses

Each built-in switch gets a curated pool of contextual responses, not one sentence forever, and not a generic quote library.

Target size: about 5–10 responses per built-in switch.

Tone examples:

- "You don't need to solve this right now."
- "This can stay unanswered."
- "If another hour of thinking was going to solve this, we'd have solved it already."
- "We have held enough imaginary meetings about this. Adjourned."

Do not show the same response twice in a row. A shuffle bag, recent-exclusion list, or similar rotation is enough.

Responses may be written in the user's voice style. They are not therapy and not diagnosis.

---

## 5. What do you need?

After the pause and the response, the app may offer one small optional branch: **What do you need?**

This is not a workflow and not a menu of everything the app can do.

- Show at most three choices.
- The choices depend on the switch.
- One choice is always an exit, such as **That's enough.**

That's enough means no more interaction, no guilt, and no further prompts. The user can leave.

Other choices, only when they fit that pattern:

- Words for me
- Words for them
- Hold this
- Help me settle
- Ask for clarity

Do not show every option on every switch.

---

## 6. Words for me

Words for me is one supportive line directed at the user.

Show one response first. If it does not land, offer something like **Another one.** Do not open a long list.

The line can follow Soft, Straight, or Unfiltered. It is not therapy or a diagnosis.

---

## 7. Words for them

Words for them helps the user say something to another person.

V1 uses curated scripts. It does not require generative AI, and it does not ask the user to type a detailed scenario.

Categories, shown only when they fit the switch:

- Say no
- Buy time
- Set a boundary
- Ask for clarity
- End the conversation

Examples:

| Switch | Categories that fit |
|---|---|
| Feeling Obligated | Say no, Buy time, Set a boundary |
| Assuming | Ask for clarity |
| Access | Set a boundary |
| Savior Mode | Buy time, Set a boundary |

A script is short, natural, copyable, and emotionally intelligent. It is not legal, medical, or professional advice. It does not accuse the other person or diagnose them.

---

## 8. Later: contextual drafting

A later paid feature may offer **Need something more specific?** and a short context field of about 300–500 characters, not a long essay. The user explains the situation in one or two sentences. AI may draft a few ways to say what they already mean.

The model is a drafting tool. It should:

- express the user's stated intent
- not diagnose motives
- not explain what the other person "really means"
- not act as a therapist
- not label a relationship as abuse or manipulation without a basis the user actually gave

This is not required for V1 unless it is separately approved later.

---

## 9. Hold this

Hold This is cognitive offloading, not a journal.

The job is: "I cannot stop thinking about this because I am afraid I will lose it." The user sets a short thought down so they do not have to keep holding it in working memory.

Default: store it, and do not remind them.

**Bring this back later** is optional. Reminder scheduling appears only if the user explicitly asks for it.

Held thoughts stay off the main screen. Do not show archive counts, streaks, analytics, or lines like "You have 37 held thoughts." Do not automatically bring distressing held thoughts back.

**Let this go** permanently removes that held thought.

The feature should feel like setting something down, not like building a diary.

---

## 10. Help me settle

If this is in V1, it is one micro-tool, not a library.

One simple settling or breathing experience is enough, on the order of 30–60 seconds. No catalog of methods, no course, and no streak. It may use the app's voice.

Do not overbuild it.

---

## 11. Voice

Voice is a core layer of the product, not a skin on top of generic copy.

The styles are **Soft**, **Straight**, and **Unfiltered**. The same intent can be said three ways.

Example:

- Soft: "Their disappointment doesn't mean you did something wrong."
- Straight: "You can say no without managing their reaction for them."
- Unfiltered: "Their disappointment is not your fucking emergency."

Unfiltered is not "add swearing." It can be blunt, dry, sarcastic, warm, or occasionally profane. The writing stays intelligent.

Do not ship random profanity, the same insult for every situation, insults aimed at the user, or anger that keeps escalating.

**Brand rule:** laugh with the user, never at the user. Humor punches at the situation, not at the person's distress. Never use demeaning language toward the user.

---

## 12. Choosing a voice

Do not make voice selection part of onboarding. Start with a balanced default.

After the person has actually used the app, it may ask **How should I talk to you?** and offer Soft, Straight, and Unfiltered. The preview uses the same scenario in each voice so the difference is obvious.

The free product must include a real use of Unfiltered, not a locked sample. Do not hide the personality behind a paywall before the user has felt it.

Later, the app may learn on the device that one person wants different voices for different switches. For example: Self-Criticism in Soft, Feeling Obligated in Unfiltered, Overthinking in Straight. That learning is a preference. It is not a mental-health report.

---

## 13. Custom responses

A person may eventually add their own lines to a switch, such as "Sarina, you will be completely okay." Those lines join that switch's rotation.

This is a strong paid personalization feature. The core product must work without any custom lines.

---

## 14. Quiet personalization

The app may learn on the device in order to be more convenient. Examples: frequently used switches are easier to reach, a preferred voice per switch, a usual "What do you need?" follow-up, a usual script category, a preferred Shutdown environment.

Use that data to change the product quietly.

Do not, by default, show how often someone spiraled or overthought, trend graphs, pathology-style statistics, or "you are getting worse" / "you are getting better." If an insight does not lead to a useful next action, do not show it.

---

## 15. Shutdown

Shutdown is the separate escalation, not a bigger switch.

- This thought or pattern is loud → toggle it off.
- Everything is loud → Shutdown.

Details stay in `docs/SHUTDOWN-INTERACTION-SPEC.md`. This canon does not change Shutdown's sensory system, durations, or the rule that the user can end it at any time.

Shutdown stays immersive, optional, and low-demand. It may be richer in sound and motion than the rest of the app. It is not therapy, meditation, or a productivity timer.

The earlier scope's undecided "Tune Out Mode" was already replaced by Shutdown. This file does not reopen that name or that open-question status.

---

## 16. Native surfaces

Reaching an action should not require walking through the whole app.

Priority:

1. Home Screen widget
2. Lock Screen or other quick controls, where they fit
3. Apple Watch later

The product can succeed when a session lasts only a few seconds.

Android and Wear OS are desirable later. They must not block the first iOS release.

---

## 17. Free and paid

No subscription is planned for launch.

Do not use ads, manipulative engagement, streak monetization, or a paywall on basic relief.

**Free** should already be a complete useful product:

- built-in switches
- the core visual reward
- balanced response pools
- a real encounter with Soft, Straight, and Unfiltered
- Words for me
- a useful core set of Words for them
- basic Hold This
- core Shutdown
- a widget

A possible **one-time full unlock** may add depth and ownership:

- unlimited custom switches
- custom response libraries
- deeper voice personalization
- the user's own response lines
- a larger script library and more situational scripts
- contextual AI drafting, if later approved
- more Shutdown environments
- richer widget customization
- later Watch personalization

**Monetization principle:** monetize depth and ownership, not basic relief.

`docs/NATIVE-V1-SCOPE.md` already includes Create Your Own Switch in the free-era scope. This canon does not remove custom switches from the product. It allows a limit on the free number, with unlimited custom switches as part of the paid unlock. The free limit is not chosen in this document.

---

## 18. Personality

Toggle should feel warm, direct, human, safe, clever, private, emotionally intelligent, occasionally funny, and blunt when the person has asked for that.

It should not feel corporate, clinical, sterile, like luxury SaaS, like a meditation spa, saccharine, or like an inspirational poster.

Internal picture, not approved public marketing copy: a quiet room with a friend who knows when to be sweet and when to say absolutely the fuck not.

---

## 19. Product laws

1. The worse the user feels, the less the app should ask from them.
2. Important actions should take no more than a few taps.
3. Help the user disengage. Do not hand them more to analyze.
4. Utility is the reward.
5. No guilt for not using the app.
6. No streak pressure.
7. No unnecessary notifications.
8. Sometimes the correct next step is "That's enough."
9. The app may adapt quietly. It should not diagnose the user back to themselves.
10. Voice may be funny or profane. It is never cruel.
11. Get out of the way when the job is done.
12. A successful session may last only seconds.

---

## 20. Superseded decisions

These earlier decisions no longer describe the intended product:

| Earlier decision | Now |
|---|---|
| Normal switch pauses use a visible 2 / 5 / 15 / 30 minute chooser (`NATIVE-V1-SCOPE.md`, and the current build) | The pause is immediate. No chooser. |
| A normal switch can show a countdown or "paused for X minutes" as its main state | The timer is hidden. Reset is automatic and silent. |
| A custom switch's duration is a user-facing setting | Same silent reset. No duration question. |
| User-facing counts or trends of mental patterns | Not planned. Local learning may only change convenience. |
| One repeating reassurance, or a generic quote library | A small contextual pool per built-in switch, rotated. |
| A broad meditation or breathing library | Not planned. At most one short settling tool. |
| Voice as optional flavor, or Unfiltered locked away | Soft, Straight, and Unfiltered are a core layer. Free includes a real use of Unfiltered. |
| The action ends at the switch and one message | "What do you need?" may offer up to three contextual next steps, including "That's enough." |

Not superseded:

- Shutdown remains a timed immersive session. Its durations and sensory rules stay in `docs/SHUTDOWN-INTERACTION-SPEC.md`.
- Built-in switches remain the main interaction.
- Data stays on the device unless a later decision says otherwise.
- The app still does not diagnose, treat, or score mental health.

---

## 21. Rejected for V1

Do not add these unless a later product decision explicitly reopens them:

- mood diary
- a required daily check-in
- streaks, badges, points, or a rewards currency
- a social feed or community pressure
- an AI therapist
- mental-health scoring or pathology analytics
- a large meditation library or a large breathing library
- automatic "you seem stressed" detection
- unsolicited reminders of distressing Held thoughts
- diagnostic or medical claims
- humor that shames the user
- profanity as the default voice for every situation

---

## 22. What to build first

The first serious TestFlight should stay narrow. Shutdown's current prototype can remain as it is. Do not widen the test build into the whole canon at once.

### A. Before the first serious user test

- Immediate switch pause, with no duration chooser and no visible countdown.
- Hidden reset, still durable across relaunch, with no reset notification.
- One restrained pause response, drawn from a real pool even if the pool is still small.
- A short visual release for built-in switches, with Reduce Motion honored.
- "That's enough" as a real way for the moment to end.
- The existing Shutdown path, unchanged by this document.

### B. Soon after that test, still part of a useful free product

- About 5–10 responses per built-in switch, without repeating the last line.
- "What do you need?" with at most three contextual choices.
- Words for me, one line at a time, plus "Another one."
- A small curated Words for them set for the switches that need it.
- Basic Hold This: save, let go, and no automatic reminder.
- A balanced default voice, then the Soft / Straight / Unfiltered question, including a genuine Unfiltered sample on the free product.
- A Home Screen widget that can reach a useful action in seconds.

### C. After the core has been used

- One short Help me settle tool, only if the earlier test shows a need.
- Custom response lines, deeper per-switch voice memory, and a larger script library as paid depth.
- More Shutdown environments, richer widgets, Lock Screen controls, and Apple Watch.
- Contextual AI drafting only if it is separately approved.
- Android, later, without blocking iOS.

---

## 23. Still unresolved

These are intentionally not decided here:

- The hidden reset length for a normal switch, and whether every switch shares one length.
- Whether tapping a paused switch still restores it immediately, or the row simply waits for the silent reset.
- How many custom switches the free product includes before the one-time unlock.
- Whether the public name becomes Pause That, or stays Toggle.
- Whether Help me settle is in the first useful free product or waits until after validation.
