# Backlog — Settle

Ideas, features, and enhancements. Add immediately when they come up during development.
Prioritized by impact on viral growth, share flow, and core UX delight.

## Format
```
### Brief title
- **Date Added:** YYYY-MM-DD
- **Priority:** low | medium | high
- **Description:** What it is and why it matters
- **Status:** backlog | in progress | done
```

---

## HIGH priority

### Dispute-first onboarding (show before login wall)
- **Date Added:** 2026-03-11
- **Priority:** high
- **Description:** When a non-auth user clicks a shared link, show the full dispute — question, sides, vote counts, timer — before asking them to log in. Only when they tap a vote button do you hit them with "Enter your number to vote." This is the Partiful pattern exactly: content creates pull, login is the last step not the first. Eliminates the single biggest drop-off in the share flow.
- **Status:** backlog

### Dynamic iMessage link preview with live vote count
- **Date Added:** 2026-03-11
- **Priority:** high
- **Description:** OG image for dispute links should be server-rendered dynamically — show both sides, the live vote tally, and countdown right in the iMessage card. Use Next.js `ImageResponse` (OG image route) baking in real-time vote state at request time. Someone forwarding the link 2 hours later sees different numbers than the first recipient. Every share is its own live ad.
- **Status:** backlog

### iMessage link previews (Open Graph)
- **Date Added:** 2026-03-11
- **Priority:** high
- **Description:** Proper Open Graph meta tags on `/s/[slug]` so sharing via iMessage/text shows a rich preview with the question and sides. Currently shows a bare URL. Critical for the share-via-text flow. Foundation required before the dynamic version above.
- **Status:** backlog

### One-tap "Text the link" share button
- **Date Added:** 2026-03-11
- **Priority:** high
- **Description:** Primary CTA on dispute page is "Text the link" — not a generic share button. Tap it, copies URL and opens `sms:&body=Settle this: [question] — vote here: [url]` with the question pre-filled. Recipient's iMessage shows the dispute question before they even open the link. Locket Widget pattern — recipient just hits Send.
- **Status:** backlog

### "I'm with [Side]" vote button copy
- **Date Added:** 2026-03-11
- **Priority:** high
- **Description:** Change vote button labels from "[Side A]" to "I'm with [Side A]". Makes the vote feel like a personal declaration, an alignment. After voting: "You're with [Side A]. [N] others agree." Tiny copy change, big personality shift. Zero engineering cost.
- **Status:** backlog

### Winner announcement copy: scoreline format
- **Date Added:** 2026-03-11
- **Priority:** high
- **Description:** Winner copy should read like a sports result — "Pizza wins — 7 to 3." not "Side A wins the dispute." Across the app: replace "expires" with "closes" ("Closes in 4 hours" sounds consequential; "expires" sounds like yogurt). Under 5 minutes: "Closes in MM:SS" with seconds ticking.
- **Status:** backlog

### Phone OTP: auto-read + instant submit
- **Date Added:** 2026-03-11
- **Priority:** high
- **Description:** Phone input auto-detects country code from device locale, shows flag. OTP field uses `autocomplete="one-time-code"` so iOS auto-reads it from SMS. Submit triggers automatically once 6 digits fill — no "Continue" button tap. Goal: tapping "Vote" → casting a vote in under 20 seconds.
- **Status:** backlog

### Display names / profiles
- **Date Added:** 2026-03-11
- **Priority:** high
- **Description:** After first login, prompt users to set a display name. Show names on votes and dispute cards instead of anonymous "1 vote". Makes the social experience feel personal — friends want to see who voted for what.
- **Status:** backlog

---

## MEDIUM priority

### Live vote bar — hidden until you vote
- **Date Added:** 2026-03-11
- **Priority:** medium
- **Description:** After casting a vote, results animate in: a horizontal bar fills left-to-right for each side simultaneously with vote counts incrementing like an odometer. Before voting, the bar is hidden — just "Vote to see results." Twitter poll pattern but more visceral. The immediate reveal creates the "did I pick the winner?" dopamine hit.
- **Status:** backlog

### Countdown timer urgency states
- **Date Added:** 2026-03-11
- **Priority:** medium
- **Description:** Timer changes color as deadline approaches: >50% remaining = green, <25% = yellow with pulse animation, <5 minutes = red with "CLOSING SOON" label and subtle heartbeat animation. Manufactured urgency mirrors BeReal's "post now" mechanic — same psychological lever, applied to voting.
- **Status:** backlog

### "Too close to call" tension state
- **Date Added:** 2026-03-11
- **Priority:** medium
- **Description:** When the leading side has ≤1 vote margin, show a pulsing indicator: "It's too close to call — every vote matters." Updates in real-time via Supabase Realtime. Gas app's compliment poll tension — you want to be the deciding vote.
- **Status:** backlog

### "Be the decider" banner when exactly tied
- **Date Added:** 2026-03-11
- **Priority:** medium
- **Description:** If vote count is exactly tied, a full-width high-contrast banner appears: "It's [N]–[N]. Your vote decides this." The next voter is literally the tiebreaker — highest possible sense of individual consequence. Disappears once anyone votes.
- **Status:** backlog

### "Side B is gaining" live page alert
- **Date Added:** 2026-03-11
- **Priority:** medium
- **Description:** While watching your own dispute live, if the opposing side takes the lead a toast appears: "Side B just took the lead — [N] vs [N]." No push needed — just on-page drama via Supabase Realtime. Makes watching your dispute feel like watching a live sports score.
- **Status:** backlog

### Confetti burst when your side wins
- **Date Added:** 2026-03-11
- **Priority:** medium
- **Description:** When a dispute closes and your side won, opening the page triggers a 2-second Canvas confetti burst with large text: "You were right." Losing side: no confetti, just "You were outvoted — [winning side] wins." Lean into the asymmetry — winners feel rewarded, losers feel it.
- **Status:** backlog

### Blurred avatar wall of voters (social proof)
- **Date Added:** 2026-03-11
- **Priority:** medium
- **Description:** While voting is live, show a row of circular blurred/grayscale avatars of people who have already voted — count visible, names hidden until results. "7 people have voted. Be next." Partiful guest list social proof pattern: seeing others participate creates pressure to join.
- **Status:** backlog

### Shareable results card ("receipts screen")
- **Date Added:** 2026-03-11
- **Priority:** medium
- **Description:** When a dispute closes, a "Copy result card" button generates a shareable image: question, scoreline, who voted for what (first names), and Settle watermark. Sized for Instagram Stories (1080×1920) and iMessage. One tap to copy/export. Spotify Wrapped mechanic — make sharing the result trivially easy, card does the marketing. Secondary viral moment beyond the initial vote invite.
- **Status:** backlog

### "The jury is in" push notification to creator
- **Date Added:** 2026-03-11
- **Priority:** medium
- **Description:** When a dispute closes, push the creator: "The jury is in — [winning side] wins [X]–[Y]. Tap to see receipts." No push to voters by default (reduce fatigue). Creator is most invested and most likely to share the result.
- **Status:** backlog

### Dispute history on public page (who voted what)
- **Date Added:** 2026-03-11
- **Priority:** medium
- **Description:** After a dispute closes, show who voted for what (with display names). Currently results only show vote counts. Transparency makes it more fun and social — friends calling each other out.
- **Status:** partially done — creator-only voter breakdown added (collapsible "Who voted" section). Next step: consider making it visible to all voters after dispute closes.

### Rematch button
- **Date Added:** 2026-03-11
- **Priority:** medium
- **Description:** After a dispute closes, show a "Rematch" button that instantly clones it with sides swapped and a fresh timer. Gas app re-engagement loop: the product itself creates the next piece of content. One dispute begets the next. Also supports dispute chain/rivalry history.
- **Status:** backlog

### Tie-breaking mechanism
- **Date Added:** 2026-03-10
- **Priority:** medium
- **Description:** When votes are tied, let the dispute creator break the tie. Alternative: overtime round with extended timer.
- **Status:** backlog

### Push notifications (web push)
- **Date Added:** 2026-03-10
- **Priority:** medium
- **Description:** Notify users when timer is about to expire and when results are in. Web push first (no native app required via PWA), native via wrapper later. Start with just creator notifications to avoid fatigue.
- **Status:** backlog

### Group disputes (multi-option polls)
- **Date Added:** 2026-03-11
- **Priority:** medium
- **Description:** Allow 3–4 options instead of always two sides. "Where should we eat?" with multiple restaurant choices. Plurality wins. Not ranked choice — keep it simple.
- **Status:** backlog

---

## LOW priority

### Vote haptic feedback + color burst animation
- **Date Added:** 2026-03-11
- **Priority:** low
- **Description:** When tapping a vote button: spring animation (scale up then settle), background flashes side's color for 200ms, medium haptic tap. Makes casting a vote feel decisive and satisfying — like pressing a real button. Keep total animation under 300ms.
- **Status:** backlog

### "X people watching" live viewer count
- **Date Added:** 2026-03-11
- **Priority:** low
- **Description:** Track connected Supabase Realtime subscribers and display "4 people watching" on live disputes. Live e-commerce social proof — creates urgency and makes the dispute feel like a live event.
- **Status:** backlog

### Pre-written share copy that names the opponent
- **Date Added:** 2026-03-11
- **Priority:** low
- **Description:** When creating a dispute against a specific person (e.g., "Me vs. Jake"), share text auto-populates as: "Jake and I need you to settle something — 3 hours left to vote." Naming a real person creates social obligation for mutual friends to participate. Gas app "name drop" mechanic.
- **Status:** backlog

### Weekly digest SMS (opt-in)
- **Date Added:** 2026-03-11
- **Priority:** low
- **Description:** One opt-in SMS per week to active creators: "You've settled 3 debates this week. You were right 2/3 times." No app required — it's a text. Streak/scorekeeping dynamic that brings people back without push notifications. Twilio already in stack.
- **Status:** backlog

### Streak / stats page
- **Date Added:** 2026-03-11
- **Priority:** low
- **Description:** Track win/loss record per user. "You've won 7 of 12 disputes." Gamification that encourages repeat use. Simple profile/stats page.
- **Status:** backlog

### Reaction emojis on results
- **Date Added:** 2026-03-11
- **Priority:** low
- **Description:** After a dispute settles, let people react with emojis (🎉, 😤, 🤷). Lightweight engagement without a full comment system. Shows on the results page.
- **Status:** backlog

### Comments on disputes
- **Date Added:** 2026-03-10
- **Priority:** low
- **Description:** Let voters leave a short comment explaining their vote. Lightweight — not a full chat.
- **Status:** backlog

### Venmo/Cash App deep links
- **Date Added:** 2026-03-10
- **Priority:** low
- **Description:** For disputes with stakes, add a "Pay up" button that deep links to Venmo/Cash App with pre-filled amount.
- **Status:** backlog

### Dispute categories
- **Date Added:** 2026-03-10
- **Priority:** low
- **Description:** Tag disputes with categories (sports, food, pop culture, etc.) for future discovery/trending features.
- **Status:** backlog

### Custom timer duration
- **Date Added:** 2026-03-11
- **Priority:** low
- **Description:** Let users enter a custom duration instead of only the 4 presets (15m, 1h, 6h, 24h). Useful for "settle this by end of day" or "5-minute lightning round" scenarios.
- **Status:** backlog

### Dark mode
- **Date Added:** 2026-03-11
- **Priority:** low
- **Description:** Support system-preferred color scheme with Tailwind dark mode. Most users share links at night. Low effort with Tailwind — just add dark: variants to key components.
- **Status:** backlog
