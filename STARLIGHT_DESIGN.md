# Starlight Restaurant: Website Design Spec

**Domain:** starlightrestaurant.co.ke
**Brand:** Starlight Chicken (chicken, pizza, burgers, shawarma, milkshakes)
**Goal:** A clean, trustworthy, mobile-first ordering site. Direct and commission-free, with a premium feel.
**Reference:** Samosa World KE (sticky nav, category pills, combo cards, FAQ); current Starlight dark theme (content and menu data).

---

## 1. Design principles

- White and off-white surfaces with generous whitespace.
- Deep purple for brand and structure. Yellow only for actions and active states.
- No busy gradients, neon glows, sparkles or floating shapes.
- Real food photography only. Soft natural light, no CGI.
- Mobile first. Everything works one-handed on a phone.

## 2. Tokens

| Token | Hex | Use |
|---|---|---|
| `--purple` | `#3B1A6B` | Headlines, logo, active pill, footer |
| `--purple-2` | `#5B2D9E` | Hover, focus ring, badges |
| `--yellow` | `#FFC82C` | Primary buttons, basket, kicker accent |
| `--ink` | `#1D1530` | Body text |
| `--muted` | `#6B6480` | Secondary text |
| `--soft` | `#F6F4F9` | Hero and image backgrounds |
| `--line` | `#E7E3EF` | Borders |

**Type:** Fraunces (serif, 600/700) for headlines. Plus Jakarta Sans (400 to 700) for UI and body.
**Radius:** 10px buttons, 14px cards, 999px pills.
**Shadow:** `0 1px 2px rgba(59,26,107,.08), 0 4px 14px rgba(59,26,107,.06)`

## 3. Layout (desktop, max width 1200px)

```
[ Nav: logo | Our Menu  Branches  Track Order  FAQs | MapPin Delivering from | PhoneCall | ShoppingCart Basket ]
[ Hero: kicker, serif H1, copy, CTAs, tip   |   family combo photo ]
[ Fulfilment widget: Delivery/Pickup | area search | Find Nearest ]
[ Our Menu: category pills ]
[ Product grid (auto-fill, min 250px) ]
[ Footer ]
```

## 4. Components

### Navigation (sticky)
- White, subtle bottom shadow.
- Left: circular purple and yellow "S" logo plus "Starlight Restaurant".
- Links: Our Menu, Branches, Track Order, FAQs.
- Location dropdown: "MapPin Delivering from: South C (Open 10 AM - 2 AM)".
- Right: purple phone link "PhoneCall 0704 878 787" and yellow "ShoppingCart Basket (Ksh 0)" button. The total updates live.
- Mobile: links collapse to a menu; the basket and phone stay visible.

### Hero
- Background `--soft`. Two columns, collapsing to one on mobile.
- Kicker: `FRESH • HOT • BRANCH-WIDE` (yellow-gold, uppercase).
- H1: "Savor the Crunch, Delivered Fast."
- Copy: "Order legendary Starlight Chicken, Pizzas, Burgers & Shawarmas directly from our branches in South C, Eastleigh, James Gichuru, Hurlingham, Muthangari, and Bamburi. Hot, fresh, and commission-free."
- Buttons: **Order for Delivery** (solid yellow, dark text) and **Self-Pickup** (purple outline).
- Tip chip: "Or call us directly to order" with a Lucide PhoneCall icon.
- Photo: bucket of fried chicken, chips in yellow Starlight-branded holders, classic pizza on a tray.

### Fulfilment widget
- Floating card that overlaps the hero edge.
- Segmented control: Lucide Bike Delivery / ShoppingBag Pickup.
- Search input for the delivery area, plus **Find Nearest** (yellow).

### Category pills
- Lucide Utensils Chicken & Wings, Pizza, Burgers, Shawarma, Coffee Milkshakes & Drinks.
- Active: purple fill with yellow text. Inactive: white with a light border.

### Product card
- Photo (16:10), category badge, name, one-line description, price, **Add to Basket +** (yellow).
- Combos (buckets, family packs) get a "Customize" flow instead of one-tap add.
- Sold-out items are greyed with a "Sold out" label and a disabled button.

## 5. Menu data (from current site)

| Category | Item | Price (Ksh) |
|---|---|---|
| Chicken | 2 Pieces w/ Chips | 400 |
| Chicken | 3 Pieces w/ Chips | 500 |
| Chicken | 5 Pieces w/ Chips | 750 |
| Chicken | 7 Pieces w/ Chips & 1.2L Soda | 1000 |
| Chicken | 9 Piece Bucket (2 large chips, 4 wings, 2L soda) | 1800 |
| Wings | 5 BBQ Wings w/ Chips (350ml soda) | 400 |
| Wings | 12 Wings, Large Chips & 1.25L Soda | 1000 |
| Burgers | Classic Burger | 400 |
| Burgers | Double Burger Meal | 650 |
| Pizza | BBQ Steak Pizza | 600 |
| Pizza | Meat Deluxe Pizza | 700 |
| Shawarma | Chicken Shawarma (Regular) | 250 |
| Sides | Chips Regular | 200 |
| Sides | Chips Large | 300 |

## 6. Accessibility and quality

- Visible keyboard focus (3px purple ring) on every control.
- Text contrast meets WCAG AA. Never rely on yellow text on white.
- `prefers-reduced-motion` respected. No decorative motion.
- Touch targets at least 44px on mobile.
- Images carry alt text. Use lazy loading and WebP.

## 7. Next.js build notes

- App Router. `Nav`, `Hero`, `FulfilmentWidget`, `CategoryPills`, `ProductCard`, `BasketDrawer` components.
- Menu data in a typed `menu.ts` (or CMS later). Basket state in Context or Zustand, persisted to `localStorage`.
- Branch and area lookup drives the "Delivering from" dropdown and Find Nearest.
- Add `Restaurant` and `Menu` JSON-LD for local SEO.
- Order handoff via WhatsApp or the existing checkout. Branch phone stays visible throughout.
