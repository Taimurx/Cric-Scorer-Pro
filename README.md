<p align="center">
  <img src="icon.png" width="110" alt="Cric Scorer Pro icon">
</p>

<h1 align="center">🏏 Cric Scorer Pro</h1>
<p align="center"><b>Score every ball like a pro — a free Android app for live cricket scoring.</b></p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/platform-Android%207.0%2B-3DDC84?logo=android&logoColor=white" alt="Platform: Android 7.0+">
  <img src="https://img.shields.io/badge/version-v2.0.10-E0567B" alt="Version v2.0.10">
  <img src="https://img.shields.io/badge/size-53%20MB-8A5F6E" alt="APK size 53 MB">
  <img src="https://img.shields.io/badge/made%20with-HTML%20%7C%20CSS%20%7C%20JS-FF9A76" alt="Made with HTML, CSS, JS">
</p>

<p align="center">
  <a href="https://github.com/Taimurx/Cric-Scorer-Pro/raw/main/cricket_pro.apk"><b>⬇️ Download APK</b></a> ·
  <a href="#-features">Features</a> ·
  <a href="#-installation">Installation</a> ·
  <a href="#-deployment">Deploy the site</a> ·
  <a href="#-faq">FAQ</a>
</p>

---

## 📖 Overview

**Cric Scorer Pro** turns any phone into a complete cricket scoring desk — ball-by-ball live scoring, full scoreboards, PDF export, tournaments, and cloud sync. Built for street, club, and tournament cricket.

This repository hosts the **official landing & download website** for the app — a single-file, bilingual (EN/BN) static site — along with the **release APK**, ready to deploy to Netlify, Vercel, or any static host.

> 🇧🇩 **বাংলায়:** ক্রিক স্কোরার প্রো একটি ফ্রি অ্যান্ড্রয়েড অ্যাপ, যা আপনার ফোনকে বানিয়ে দেয় একটি পূর্ণাঙ্গ ক্রিকেট স্কোরিং ডেস্ক — বল-বাই-বল লাইভ স্কোরিং, ফুল স্কোরবোর্ড, PDF এক্সপোর্ট, টুর্নামেন্ট ও ক্লাউড সিংক সহ। এই রিপোজিটরিতে অ্যাপের অফিসিয়াল ওয়েবসাইট এবং ডাউনলোডযোগ্য APK রাখা আছে।

## 📑 Table of contents

- [Features](#-features)
- [Inside the app](#-inside-the-app)
- [Download & installation](#-installation)
- [Project structure](#-project-structure)
- [Tech stack](#-tech-stack)
- [Deployment](#-deployment)
- [FAQ](#-faq)
- [License](#-license)
- [Contact](#-contact)

## ✨ Features

| | |
|---|---|
| 🏏 **Ball-by-ball scoring** | Runs, wides, no-balls, byes, leg-byes, wickets, retire, swap batsman — with one-tap undo. |
| 🧠 **Smart scoring engine** | Automatic strike rotation, legal-ball tracking, maiden-over detection. 1–90 overs per innings. |
| 📋 **Full scoreboard** | Complete batting/bowling cards, extras, match summary and result — live and post-match. |
| 📄 **PDF export** | Export the full scoreboard as a print-ready PDF and share it with teams. |
| 🏆 **Tournaments** | Knockout and league formats with super-over tiebreakers, points table and leaderboard. |
| 👥 **Team management** | Save teams and players once, reuse them across every match and tournament. |
| ☁️ **History & cloud sync** | On-device match history with resume support; optional Google sign-in for cloud backup. |
| 🎨 **3 beautiful themes** | Sunrise, Ocean and Midnight — each with light/dark modes and high-refresh display support. |

## 📱 Inside the app

- **Live scoring** — big score, big buttons, everything readable at a glance from the boundary line.
- **Full scoreboard + PDF** — complete batting/bowling cards with strike rate, export-ready.
- **Tournament leaderboard** — auto-updating points table for league and knockout formats.

## ⬇️ Installation

1. **Download the APK** — tap the download button on the [website](https://github.com/Taimurx/Cric-Scorer-Pro/raw/main/cricket_pro.apk) (53 MB).
2. **Allow installation** — open the file; if prompted, allow "Install unknown apps" for your browser.
3. **Install & open** — tap Install, then launch Cric Scorer Pro.
4. **Start scoring** — set teams, overs and toss, and score the first ball.

> 💡 Android may warn that the app is installed outside the Play Store — this is normal for direct APK downloads. Requires **Android 7.0 (Nougat) or newer**.

## 🗂️ Project structure

```
Cric-Scorer-Pro/
├── index.html         # Single-file bilingual (EN/BN) landing page
├── cricket_pro.apk    # Release APK (v2.0.10, ~53 MB)
├── icon.png           # App icon
├── favicon.png        # Site favicon
├── netlify.toml        # Netlify config — correct MIME/headers for the APK download
├── vercel.json          # Vercel config — correct MIME/headers for the APK download
├── DEPLOY.md             # Step-by-step deploy guide (Bengali)
└── LICENSE                # MIT license
```

## 🛠️ Tech stack

**Website** — vanilla HTML5, CSS3 and JavaScript, zero build step and zero frameworks:
- Google Fonts (`Outfit` + `Hind Siliguri`) for EN/BN typography
- CSS custom properties for theming, `IntersectionObserver` for scroll-reveal animations
- `localStorage` to remember the visitor's chosen language

**App** — distributed here as a signed release APK (`cricket_pro.apk`, v2.0.10). This repository hosts the download site only; the native Android app source lives in a separate codebase.

## 🚀 Deployment

The site is a static folder — deploy it anywhere that serves static files.

**Netlify**
1. Go to [app.netlify.com](https://app.netlify.com) → *Add new site* → *Deploy manually*.
2. Drag & drop this folder. Done — your site is live.

**Vercel**
```bash
npx vercel --prod
```
Framework preset: **Other**, build command: empty.

Both `netlify.toml` and `vercel.json` already set the correct `Content-Type`/`Content-Disposition` headers so the APK downloads correctly instead of opening inline.

📄 See [DEPLOY.md](DEPLOY.md) for a detailed walkthrough (Bengali).

## ❓ FAQ

<details>
<summary>Is the app free?</summary>
<br>Yes — Cric Scorer Pro is completely free to download and use.
</details>

<details>
<summary>Does it work offline?</summary>
<br>Yes. Scoring, history and tournaments all work fully offline — data is stored on your phone. Cloud sync is optional and only needs internet for Google sign-in.
</details>

<details>
<summary>What if I close the app mid-match?</summary>
<br>Nothing is lost. Every ball is saved instantly — reopening the app offers to resume your unfinished match exactly where you left off.
</details>

<details>
<summary>Can I run a full tournament?</summary>
<br>Yes — knockout or league tournaments, with super-over tiebreakers, an automatic points table and a leaderboard.
</details>

## 📄 License

Released under the [MIT License](LICENSE) — © 2026 Taimurx.

## 📬 Contact

**Taimurx** — [github.com/Taimurx](https://github.com/Taimurx)

<p align="center">Made with ❤️ for cricket.</p>
