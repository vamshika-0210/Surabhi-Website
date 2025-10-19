Goshala Website
================

This is a simple, responsive static website for a Goshala (cow shelter). It includes pages for Home, About, Donate, Gallery, and Contact.

Quick start
-----------

- Open `index.html` directly in your browser, or
- Run a lightweight local server:
  - Python 3: `python3 -m http.server -d . 8080` then visit http://localhost:8080
  - Node (serve): `npx serve .`

Structure
---------

- `index.html` — Home page with mission, programs, and CTAs
- `about.html` — About the goshala, values, and team
- `donate.html` — Donation options and sponsorship tiers
- `gallery.html` — Photo grid with responsive layout
- `contact.html` — Contact info and simple mailto form
- `assets/css/styles.css` — Global styles
- `assets/js/main.js` — Small JS for nav and form UX
- `assets/images/` — Placeholder images (logo and QR)

Customization
-------------

- Replace `assets/images/logo.svg` with your real logo.
- Update contact details and social links in the footer.
- Swap Unsplash placeholder images in `gallery.html` with your own.
- Configure real donation links (UPI/Razorpay/PayPal) in `donate.html`.

Deployment
----------

- Any static hosting works: GitHub Pages, Netlify, Vercel, S3, etc.
- Ensure the site root contains these files; no build step required.

