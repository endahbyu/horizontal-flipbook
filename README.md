# MCMC Licensing 2025 — Interactive Flipbook

Digital flipbook report berbasis **StPageFlip** (open-source, MIT license).

## Struktur
```
mcmc-flipbook/
├── index.html                 # halaman utama (struktur HTML)
├── css/
│   └── style.css              # semua styling
├── js/
│   ├── main.js                # logika flipbook (halaman, kontrol, responsive)
│   └── vendor/
│       └── page-flip.browser.js   # library StPageFlip (v2.0.7, MIT)
└── assets/
    └── img/                   # 10 halaman (page-01.webp … page-10.webp)
```

## Fitur
- Efek balik halaman 3D (hard-cover di cover & back cover)
- Responsive: 1 halaman di HP (portrait), 2 halaman (spread) di desktop
- Self-contained — tanpa CDN / dependensi eksternal

## Cara jalankan lokal
Buka `index.html` langsung di browser, atau pakai server statis:
```bash
python3 -m http.server 8000
# buka http://localhost:8000
```

## Deploy
- **Netlify**: upload folder ini (atau drag-drop), root-nya `index.html`.
- **Server MCMC**: taruh seluruh folder ini di subdirectory `/ipr/2025/`.
  - Flipbook jadi sub-page: `https://mcmc.gov.my/ipr/2025/`
  - Aman: folder terpisah, tidak menyentuh code tahun 2024.

## Embed ke halaman lain (opsional)
```html
<iframe src="/ipr/2025/" width="100%" height="800" style="border:0"></iframe>
```
iframe mengisolasi CSS/JS flipbook dari halaman induk — tidak ada bentrok.
