# Deploy — Cric Scorer Pro Website

এই `site` ফোল্ডারটাই পুরো ওয়েবসাইট। ভেতরে যা আছে:

- `index.html` — মূল সাইট (EN/BN toggle সহ, single file)
- `cricket_pro.apk` — অ্যাপের release APK (v2.0.10)
- `icon.png`, `favicon.png` — অ্যাপ আইকন
- `netlify.toml` / `vercel.json` — APK ডাউনলোড হেডার কনফিগ

## Netlify (সবচেয়ে সহজ)

1. https://app.netlify.com → "Add new site" → **"Deploy manually"**
2. পুরো `site` ফোল্ডারটা drag & drop করুন
3. ব্যস — সাইট লাইভ। Site settings থেকে নাম বদলে নিন (যেমন `cricscorerpro.netlify.app`)

নতুন APK ভার্সন এলে: `cricket_pro.apk` replace করে আবার drag & drop।

## Vercel

1. https://vercel.com → "Add New Project"
2. CLI দিয়ে হলে: `site` ফোল্ডারে গিয়ে `npx vercel --prod`
3. Framework preset: **Other**, build command খালি রাখুন

## নোট

- APK ১০০MB-এর নিচে (৫৩MB), তাই দুই প্ল্যাটফর্মেই সরাসরি হোস্ট করা যাবে
- ভবিষ্যতে ভার্সন বদলালে `index.html`-এ v2.0.10 লেখাগুলোও আপডেট করবেন (hero, meta chips, download band)
