# 🧁 My Bakery - Frontend v.0

## Project Structure

```
bakery/
├── index.html  → Home page
├── pages/          → All HTML pages
│   ├── menu.html   → Product menu with filters
│   ├── cart.html   → Shopping cart + checkout
│   ├── login.html  → Login
│   ├── signup.html → Signup
│   ├── profile.html→ User profile (favorites, orders, settings)
│   ├── about.html  → About us page
│   └── contact.html→ Contact form + map
├── css/            → All stylesheets
├── js/             → All JavaScript files
│   ├── authHelper.js → getUser(), isLoggedIn(), logout()
│   ├── auth.js       → login(), signup() functions
│   ├── component.js  → Navbar/footer loader
│   ├── banner.js     → Homepage slider
│   ├── menu.js       → Product grid + filters + cart + favorites
│   ├── cart.js       → Cart management + checkout
│   └── profile.js    → Profile tabs + orders + settings
├── components/     → Reusable navbar.html & footer.html
├── data/           → products.json (15 products)
└── assets/images/  → Place your images here
```

## How to Run

Serve with any static server:

```bash
# Option 1: VS Code Live Server (recommended)
# Option 2:
npx serve .
# Option 3:
python -m http.server 3000
```

Then open: http://localhost:3000/pages/index.html
           

## Coupon Codes (for testing)

- SWEET10 → 10% off
- BAKERY20 → 20% off
- FIRST15 → 15% off

## Backend ( with Express + Node.js)
on render 
Currently using localStorage for:

- User authentication
- Cart & favorites
- Order history
