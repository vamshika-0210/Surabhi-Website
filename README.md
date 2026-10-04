Goshala Website
================

This is a simple, responsive static website for a Goshala (cow shelter). It includes pages for Home, About, Donate, and Contact, plus rich sections such as an immersive 3D walkthrough, mission & vision highlights, a family tree, and a photo carousel on the landing page.

Quick start
-----------

- The 3D hero uses ES modules, so it needs a local server (opening the file directly will only show the plain gradient background):
  - Python 3: `python3 -m http.server -d . 8080` then visit http://localhost:8080
  - Node (serve): `npx serve .`

Structure
---------

- `index.html` — Home page with immersive 3D hero, mission/vision, family tree, programs, and gallery carousel
- `about.html` — About the goshala, values, and team
- `donate.html` — Donation options and sponsorship tiers
- `contact.html` — Contact details with map embed and visit planning info
- `assets/css/styles.css` — Global styles
- `assets/js/main.js` — Navigation, header state, scroll reveals, gallery, 3D tour buttons, forms
- `assets/js/goshala-3d.js` — The interactive 3D hero (three.js r160, vendored in `assets/vendor/three/`)
- `assets/images/` — Logo, QR code, photos

Customization
-------------

- Replace `assets/images/logo.svg` with your real logo.
- Update contact details and social links in the footer.
- Swap carousel images in `index.html` with your own goshala photos.
- Configure real donation links (UPI/Razorpay/PayPal) in `donate.html`.

Deployment
----------

- Any static hosting works: GitHub Pages, Netlify, Vercel, S3, etc.
- Ensure the site root contains these files; no build step required.

3D hero notes
-------------

- Whole scene is ~9 draw calls: static buildings are merged into one mesh, trees and cows are instanced.
- Quality tiers (high / medium / low) are picked from device hints; a frame-time monitor lowers resolution automatically if needed.
- Rendering pauses when the hero is off-screen or the tab is hidden; `prefers-reduced-motion` and Save-Data are respected.
- Touch: swipe sideways to orbit, vertical swipes still scroll the page.
