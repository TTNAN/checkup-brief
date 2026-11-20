# checkup-brief

> **For health education only. This is not a diagnosis and does not replace a doctor.**
>
> [中文版 → README.md](README.md)

Turn your checkup report into a one-page brief you can actually understand.

Every year, millions of people get a checkup report they cannot read: What does a total cholesterol of 6.12 mean? Is a uric acid level of 452 serious? Which department should I visit? What should I check next time? checkup-brief exists to answer those questions — paste a report and get a one-page briefing in plain language: an overall score, red / yellow / green lights, a clear explanation for every abnormal result, plus what to check next time, which department to visit, and how to improve over 30 days, all on one page.

## The problem

- Checkup reports are full of jargon and numbers. Most people cannot read them and have to wait for a doctor's one-line summary.
- Every hospital writes indicator names, units, and reference ranges differently. ALT is also written as alanine aminotransferase; copy-pasting rarely lines up.
- Reports get filed away and forgotten. Next year, nobody knows what to add or what to skip.
- When something is abnormal, people do not know which department to book or what to ask the doctor.
- Reports say "high lipids" but never say what to actually do in the next 30 days.

## Features

This repository is built around **feature 1, with features 3 / 4 / 5 / 6 embedded inside it**. A multi-year trend heatmap is intentionally out of scope.

### 1. One-page plain-language briefing (the core)

One report, one briefing:

- An overall score out of 100, with a public scoring rule: 7 points off per out-of-range result, 2 points off per borderline-high result, blood pressure counted once
- Red / yellow / green lights: out of range, borderline high, normal
- One plain-language explanation per abnormal result, no jargon
- A shareable card you can screenshot and send to family

Example: a 32-year-old man scores **68** — 4 results out of range (total cholesterol, triglycerides, ALT, uric acid) and 3 borderline high (fasting glucose, systolic and diastolic pressure). See [examples/sample-brief.md](examples/sample-brief.md).

### 3. Chinese checkup report parser

- Paste report text to parse it; text copied from a PDF or OCR output works too
- Alias normalisation: ALT = alanine aminotransferase, total cholesterol = TC, triglycerides = TG, uric acid = UA, fasting glucose = FPG — 30 indicators in total, see [src/aliases.js](src/aliases.js)
- Reference ranges printed on the report take priority; built-in ranges are used only as a fallback ([src/reference-ranges.js](src/reference-ranges.js), covering blood count, glucose, lipids, liver and kidney function, uric acid, thyroid, blood pressure, and BMI)
- Output is a structured array of indicators with red / yellow / green flags

### 4. Checkup package recommender

Based on age, sex, family history, budget, and the gaps in the current report, it recommends what to check next time:

- Recommended add-ons: lipid retest, liver ultrasound, uric acid retest with kidney function, and more
- Optional: thyroid ultrasound, tumour marker screening, and more
- What to skip: a full tumour marker panel with no indication, repeating tests that were already normal

### 5. Clinic & consultation checklist generator

For each abnormal result:

- Which department to book (for example, high uric acid → rheumatology / nephrology)
- What to bring
- Which questions to ask the doctor

### 6. 30-day improvement plan

A 30-day plan based on the abnormal results, covering only food, movement, and sleep — no medicines, no dosages:

- Just three small things a day
- One theme per week: week 1, track what you actually do; week 2, replace the oiliest meal; week 3, make exercise a fixed habit; week 4, review
- Daily check-ins (eat / move / sleep), stored locally only

## Quick start

### Demo (no installation)

Double-click `web/index.html`. It is a plain static page: no server, no network, no external fonts or images, and it works offline.

Or serve it locally — same result:

```bash
cd checkup-brief
python3 -m http.server 8000
# open http://localhost:8000/web/index.html
```

The demo defaults to Chinese, with a **中文 / EN** toggle at the top. Click it to switch the whole page to English.

### Run the parser in code

```js
const { parseReportText } = require('./src/parser.js');
const { buildBriefing } = require('./src/briefing.js');

const items = parseReportText('Total cholesterol (TC) 6.12 mmol/L reference <5.2\nTriglycerides (TG) 2.48 mmol/L reference <1.7');
const briefing = buildBriefing(items, { age: 32, sex: 'male' });
console.log(briefing.score); // 68 (using the full data in examples/sample-report.txt)
```

See [examples/sample-report.txt](examples/sample-report.txt) (input), [examples/sample-report.json](examples/sample-report.json) (parsed result), and [examples/sample-brief.md](examples/sample-brief.md) (briefing).

## Screenshots

Screenshot placeholders (no screenshots generated yet — contributions welcome):

- `docs/screenshots/briefing.png` — the one-page briefing: score, red / yellow / green lights, per-item explanations
- `docs/screenshots/parser.png` — the parser: pasted text → structured table
- `docs/screenshots/plan.png` — the 30-day plan: weekly themes and daily check-ins

Never include a real checkup report in a screenshot. Use only the de-identified sample data in this repository.

## Privacy: local by default

- Parsing, scoring, and recommendations all run locally. Nothing is uploaded or stored.
- The demo page collects no data and makes no third-party requests.
- Do not post a real checkup report in an Issue or pull request.
- See [docs/PRIVACY.md](docs/PRIVACY.md).

## Disclaimer

This project is for health education only. It is not a diagnosis and does not replace a doctor or a formal examination. Indicators vary by sex, age, reagent, and hospital range — always follow the reference range printed on your own report and your doctor's explanation. Decisions about medication, stopping medication, or recheck intervals must be made with a doctor. The score is an educational aid, not a medical score.

## Repository layout

```
checkup-brief/
├── README.md                  Chinese home page
├── README_EN.md               English version
├── LICENSE                    MIT
├── index.html                 Root entry, redirects to web/index.html
├── web/
│   ├── index.html             Static demo page
│   ├── styles.css             Styling (restrained, generous whitespace, no external assets)
│   └── app.js                 Interactions: zh/EN toggle, five modules, check-ins
├── src/
│   ├── reference-ranges.js    Adult reference ranges for common indicators
│   ├── aliases.js             Chinese indicator alias table (30 entries)
│   ├── parser.js              parseReportText(text)
│   ├── briefing.js            buildBriefing(items, profile)
│   ├── package-recommender.js recommendPackage(...)
│   ├── clinic-guide.js        buildClinicGuide(items)
│   └── plan-30d.js            buildPlan30d(items, profile)
├── examples/
│   ├── sample-report.txt      Sample report text (de-identified)
│   ├── sample-report.json     Parsed structured result
│   └── sample-brief.md        Sample one-page briefing
└── docs/
    ├── ARCHITECTURE.md
    ├── PRIVACY.md
    ├── ROADMAP.md
    └── CONTRIBUTING.md
```

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md). Currently out of scope: a multi-year trend heatmap.

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md). Contributions of indicator aliases, reference ranges, and hospital report formats are welcome — but only with de-identified sample data. Never submit a real checkup report.

## License

MIT License, author TTNAN, see [LICENSE](LICENSE).
