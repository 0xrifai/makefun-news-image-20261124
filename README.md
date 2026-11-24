# The World Today — 24 November 2026

[![make.fun](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/0xrifai/makefun-news-image-20261124/rank.svg)](https://make.fun/bounty/news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/0xrifai/makefun-news-image-20261124/reward.svg)](https://make.fun/bounty/news-image-20261124)

A 1024×1024 newspaper front page that sums up the world news of **Tuesday 24 November 2026**, drawn entirely in code by `main.ts` (Node 22, standard library only, no network at run time). No photos, no downloaded fonts — a hand-built 5×7 bitmap alphabet, a software canvas, and a hand-rolled PNG encoder.

## The stories on the page

1. **Lead — Nvidia reinstates Jensen Huang as CEO.** Eleven days after he resigned over affair and espionage revelations, the board voted unanimously to bring him back after direct intervention by President Trump. Nvidia jumped ~31%, its best day since 2003. *Sources: Reuters, Bloomberg, NPR, AP.*
2. **Markets roar back.** Nasdaq +6.5%, S&P 500 +4.7%, Dow +3.0% — the biggest Wall Street rally since April 2025; SK hynix +21%, Micron +19%, Tesla +11%; Seoul's KOSPI +5.9% on Tuesday. *Sources: AJU Press, Seoul Economic Daily.*
3. **Iran demands $290bn from the US.** Iranian courts order the US to pay $290bn in damages and sue Gulf states for hosting US strikes; Tehran vows to break the US naval blockade by all means. *Sources: AFP, Iranian state TV (via Clash Report).*
4. **Russian jets buzz Korea.** Seoul scrambles fighters as several Russian military planes enter its air defence zone near Ulleung Island; a shelter alert sounds and lifts within five minutes. No airspace violated. *Sources: Reuters, AP, Yonhap.*
5. **Ukraine sinks Russian warship off Libya.** Seven Ukrainian sea drones sink the corvette Merkury — one of Russia's newest ships — at Benghazi naval base and hit the cargo ship Angara. *Sources: AP, President Zelenskyy.*
6. **Drone flattens flats near Kyiv; boy saved.** A Russian drone strike collapses a five-storey block in Dymer, killing 11; rescuers pull a boy alive from the rubble as the regional toll climbs to 14. *Sources: Reuters.*

All six stories were first reported on 23–24 November 2026 (the overnight US announcements land on the 24th in Asia, where this front page is dated).

## How it works

- `main.ts` builds a 1024×1024 RGB canvas in memory, draws the masthead, market ticker, lead story with a chip-and-chart scene, a markets rail, and four illustrated story panels, then writes `$MAKEFUN_OUTPUT_DIR/entry.png`.
- The PNG writer is hand-rolled: raw scanlines, `zlib.deflateSync`, CRC32, IHDR/IDAT/IEND chunks. Output is fully deterministic — two runs produce byte-identical files.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Verified locally on 24 Nov 2026: two runs produce byte-identical `entry.png` files (1024×1024, ~22 KB, well under the 1 MiB limit).

## Bounty

[news-image-20261124 on make.fun](https://make.fun/bounty/news-image-20261124) — "Sum up 24 November's world news in one image". Entry by [@0xrifai](https://github.com/0xrifai).

## License

MIT — see [LICENSE](LICENSE).
