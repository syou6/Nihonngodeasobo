// Hook variants — the opening frame is the single biggest driver of watch-through
// on TikTok. Same verified pair audio, different psychological angle, so one
// dictionary-correct pair yields several distinct-feeling posts (real runway
// without inventing unverified pitch). Rotate these across the calendar.
export const HOOKS = [
  {
    id: 'mistake',
    kicker: '95% OF LEARNERS GET THIS WRONG',
    same: 'same sound — but it means TWO things 👇',
    ctaLine: 'Got it right? <span class="y">prove it.</span>',
    btn: `What's YOUR ear score? →`,
  },
  {
    id: 'native',
    kicker: 'A NATIVE HEARS THIS INSTANTLY',
    same: 'one sound, two words — can your ear split them? 👇',
    ctaLine: 'Think like a native? <span class="y">test it.</span>',
    btn: 'Score your ear — free →',
  },
  {
    id: 'pov',
    kicker: "POV: YOU'VE BEEN SAYING IT WRONG",
    same: 'the pitch flips the meaning — most miss it 👇',
    ctaLine: 'Been saying it right? <span class="y">check.</span>',
    btn: 'Test your pitch — free →',
  },
  {
    id: 'challenge',
    kicker: 'CAN YOUR EAR PASS THIS?',
    same: 'identical sound — only the pitch differs 👇',
    ctaLine: 'Passed? <span class="y">get your score.</span>',
    btn: `What's YOUR ear score? →`,
  },
];

export const hookById = (id) => HOOKS.find((h) => h.id === id) ?? HOOKS[0];
