# Writing on rcprojects.net

Everything you write lives in plain-text files ending in `.md`.
You never need to open an `.html` file to write.

To change words: open the `.md` file on GitHub, click the pencil, write, then **Commit changes**.
To add a picture: upload it into the **same folder** as the file that names it.
Names: lowercase, hyphens instead of spaces (`the-storm.md`, `bear-at-the-beach.jpg`). Capitals matter.

## The symbols

| You type | You get |
|---|---|
| `# The Storm` | the title |
| `## Morning` | a subheading |
| a blank line | a new paragraph (the first one gets the big red letter by itself) |
| `*words*` / `**words**` | *italics* / **bold** |
| `> She said...` | a quotation, with the gold line at its side |
| `---` | the little flower divider |
| `- something` / `1. something` | a list |
| `![The ranch at dawn](ranch.jpg)` | a picture with words under it |
| `[a link](https://...)` | a link in a sentence |
| `[VISIT THE SITE](https://...)` alone on a line | a button |
| `// a note` | a note to yourself: never shown on the site |

## The card lines (optional, at the very top of a file)

A few `name: value` lines before the first blank line dress the card:

```
kicker: the small line above the title
facts: SMALL CAPITALS UNDER THE TITLE
picture: a-picture.jpg
before: before.jpg
after: after.jpg
shots: one.jpg, two.jpg
button: VISIT THE SITE | https://...
note: a small line under the button
credits: who helped
stamp: IN THE MAKING
seal: yes
```

Books also understand `label: chapter one` (the small line above a chapter's title).

## Lists

A list file says what is in a place, in order. One line each:

```
- The Storm: the-storm.md
- A Sealed Tale: sealed: a-sealed-tale.md
```

`sealed:` (or `private:`) means the file lives in the warehouse, files.rcprojects.net, in that folder.
To add something: write its file, then add its line. To remove it: delete its line.

## Where everything lives

**The Lectern** `realms/lectern/`
- `words/` — the CV, the eight degrees, research, teaching, now and next, the extended CV
- `publications/list.md` and `conferences/list.md` — the two books, one file per entry

**The Companion** `realms/companion/`
- `ai-chapters/list.md` — The AI Companion
- `bear-chapters/list.md` — Bear (her photos go in `bear-chapters/` too)

**The Atelier** `realms/atelier/`
- `drawings/list.md`, `structures/list.md` — one file per piece, with `before:` and `after:`
- `recipes/list.md` — `# Greek Kitchen` and `# Keto` sections, one file per recipe
- `words/garden.md`, `words/coming.md`

**The Pondering** `realms/pondering/`
- `essays/list.md` — `2. The Title: its-file.md` (the number is the lily pad: 1–3 back row, 4–6 front)
- `pinboard/list.md` — `- the-picture.jpg: the words under it`

**The Forest** `realms/forest/words/` — one file per person on the signpost

**The Playgrounds** `realms/playgrounds/`
- `games/` — one file per cabinet's game
- `words/maker.md` — The Maker
- `riddles.md` — `- The riddle? | The answer.`

**Edgewood** `realms/edgewood/`
- `characters/list.md` — who is in the portrait book, group by group (`# Kindred`, then `- cal-weston`)
  - `characters/cal-weston.md` — one character; their picture `cal-weston.jpg` beside it
  - at the top of a character's file: `title:`, `places:` (e.g. `Briarwick: home; Blackmere: work (Mon–Wed)`),
    `picture:`, and `focus:` / `zoom:` for the oval
  - `- faces to come: 15` in the list adds empty ovals
- `places/briarwick.md` — the words on each of the 15 place cards
- `stories/list.md` — the chest of stories
- `chapters/list.md` — the Oughtobiography
- `tales-by-the-fire.md`, `world.md`

**The note for whoever finds all seven circles** `assets/seven-of-seven.md`
