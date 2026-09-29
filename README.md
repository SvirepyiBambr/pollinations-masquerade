# 🎭 Masquerade

**A pass-and-play party deduction game with an AI host.** Everyone shares one device. The host —
**The Curator** — invents a fresh secret-society scenario, splits the room into a loyal majority and a
hidden minority, deals each guest a private role, narrates the rounds **aloud**, runs the discussion
timer, answers your questions **in character**, then tallies the vote and reads the verdict with
text-to-speech.

Built for the [Pollinations](https://pollinations.ai) app catalog. Playable URL:
**https://svirepyibambr.github.io/pollinations-masquerade/**

## What makes it different

Most pass-and-play deduction apps stop at "assign roles + one AI premise". Masquerade makes the AI host a
**live character**:

- **Interrogate the host.** Between rounds, anyone at the table can type or speak a question and The
  Curator answers in character — atmospheric, evasive, occasionally misleading, never leaking who is in
  the hidden minority.
- **Spoken rounds and verdict.** Every premise, twist and the final reveal are narrated with the
  Pollinations speech endpoint, so the table listens instead of reading.
- **Portraits of the guests.** One tap paints a Renaissance-style portrait for every player
  ([`flux`](https://gen.pollinations.ai/image/models)).
- **Pass-the-device secrecy.** Roles and votes are revealed one player at a time.
- **A new society every game.** Role split, factions and three rounds of twists are generated per session.

## How to play

1. Enter your Pollinations key (top right) and pick 4–10 players.
2. The Curator writes tonight's scenario and deals secret roles (hidden minority = 1 for up to 6 players,
   2 for 7+; traitors learn each other's names).
3. Pass the device so each guest reads their role privately.
4. Three rounds: the Curator narrates a twist, you start the discussion timer, and you may question the
   host at any time.
5. Call the vote — everyone secretly banishes a suspect. The Curator tallies it, reveals the cast and
   narrates the epilogue.

## Bring your own Pollen

This app bills **your** Pollinations key; nothing is embedded and no key is sent anywhere except the
Pollinations API. Enter your key in the header — it is stored only in your browser's `localStorage`.

Get a key: <https://github.com/pollinations/pollinations/blob/main/BRING_YOUR_OWN_POLLEN.md>

## API endpoints used

| Purpose | Endpoint | Model |
| --- | --- | --- |
| Scenario, narration, host Q&A, epilogue | `POST https://gen.pollinations.ai/v1/chat/completions` | `openai` |
| Spoken rounds and verdict | `POST https://gen.pollinations.ai/v1/audio/speech` | `tts-1` |
| Guest portraits | `POST https://gen.pollinations.ai/v1/images/generations` | `flux` |
| Voice questions (fallback) | `POST https://gen.pollinations.ai/v1/audio/transcriptions` | `openai/whisper-large-v3` |

## Run locally

It is a single static file — open `index.html`, or serve it:

```bash
python3 -m http.server 8080
```

## License

MIT
