# Backlog — Settle

Ideas, features, and enhancements. Add immediately when they come up during development.

## Format
```
### Brief title
- **Date Added:** YYYY-MM-DD
- **Priority:** low | medium | high
- **Description:** What it is and why it matters
- **Status:** backlog | in progress | done
```

---

### Tie-breaking mechanism
- **Date Added:** 2026-03-10
- **Priority:** medium
- **Description:** When votes are tied, let the dispute creator break the tie. Alternative: overtime round with extended timer.
- **Status:** backlog

### Push notifications
- **Date Added:** 2026-03-10
- **Priority:** medium
- **Description:** Notify users when someone votes on their dispute, when timer is about to expire, and when results are in. Requires native app wrapper.
- **Status:** backlog

### Dispute categories
- **Date Added:** 2026-03-10
- **Priority:** low
- **Description:** Tag disputes with categories (sports, food, pop culture, etc.) for future discovery/trending features.
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

### Display names / profiles
- **Date Added:** 2026-03-11
- **Priority:** high
- **Description:** After first login, prompt users to set a display name. Show names on votes and dispute cards instead of anonymous "1 vote". Makes the social experience feel personal — friends want to see who voted for what.
- **Status:** backlog

### Rematch / follow-up disputes
- **Date Added:** 2026-03-11
- **Priority:** medium
- **Description:** After a dispute settles, let the creator (or loser) create a "rematch" — a new dispute linked to the original. Shows dispute chains and rivalries. One-tap creation with the same participants.
- **Status:** backlog

### Dispute history on public page
- **Date Added:** 2026-03-11
- **Priority:** medium
- **Description:** After a dispute closes, show who voted for what (with display names). Currently results only show vote counts. Transparency makes it more fun and social.
- **Status:** backlog

### Custom timer duration
- **Date Added:** 2026-03-11
- **Priority:** low
- **Description:** Let users enter a custom duration instead of only the 4 presets (15m, 1h, 6h, 24h). Useful for "settle this by end of day" or "5 minute lightning round" scenarios.
- **Status:** backlog

### Reaction emojis on results
- **Date Added:** 2026-03-11
- **Priority:** low
- **Description:** After a dispute settles, let people react with emojis (🎉, 😤, 🤷). Lightweight engagement that doesn't need a full comment system. Shows on the results page.
- **Status:** backlog

### Group disputes (multi-option polls)
- **Date Added:** 2026-03-11
- **Priority:** medium
- **Description:** Instead of always two sides, allow 3-4 options. "Where should we eat?" with multiple restaurant choices. Plurality wins. Keeps it simple — not ranked choice.
- **Status:** backlog

### Streak / stats page
- **Date Added:** 2026-03-11
- **Priority:** low
- **Description:** Track win/loss record per user. "You've won 7 of 12 disputes." Gamification that encourages repeat use. Show on a simple profile/stats page.
- **Status:** backlog

### iMessage link previews (Open Graph)
- **Date Added:** 2026-03-11
- **Priority:** high
- **Description:** When sharing a dispute link via iMessage/text, show a rich preview with the question and sides. Requires proper Open Graph meta tags on the `/s/[slug]` page. Critical for the share-via-text flow — currently shows a bare URL.
- **Status:** backlog

### Dark mode
- **Date Added:** 2026-03-11
- **Priority:** low
- **Description:** Support system-preferred color scheme with Tailwind dark mode. Most users will share links at night. Low effort with Tailwind — just add dark: variants to key components.
- **Status:** backlog
