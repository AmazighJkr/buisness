# EmbeddedGrid — Website Description

## Overview

**EmbeddedGrid** is a full-stack web platform for an embedded-systems and IoT engineering business. It combines a public marketing site, an open project lab (portfolio), client project quoting and tracking, subscription access to premium content, and an Algeria-focused hardware store — all in one bilingual (English / French) application.

**Production URL:** [https://embeddedgrid.onrender.com](https://embeddedgrid.onrender.com)

**Tagline:** *IT, Electronics, Maintenance & Consulting*

---

## What the platform does

| Area | Purpose |
|------|---------|
| **Main website** | Presents services, enterprise positioning, and contact channels |
| **Project lab** | Browse embedded projects with code, schematics, materials, simulations, and 3D previews |
| **Commands** | Clients submit custom build requests; staff quote, track status, and exchange messages |
| **Subscriptions** | Paid packs unlock premium projects and features |
| **Store** | Hardware shop for Algeria (DZD) with categories, cart, and checkout |
| **Admin panel** | Staff manage projects, store, commands, customers, economics, and content |

---

## Public pages & routes

| Route | Description |
|-------|-------------|
| `/` | Landing page — hero, enterprise pillars, services, contact form |
| `/projects` | Project catalog with categories and search |
| `/projects/:id` | Project detail — cover image, schematic, code, 3D model, materials, video, simulation |
| `/command` | Submit a custom embedded/IoT project request |
| `/track` | Track command status by code or email |
| `/subscriptions` | View and purchase subscription packs |
| `/account` | User account, orders, and subscriptions |
| `/store` | Store home — hero carousel, trending products, brands, contact |
| `/shop` | Product catalog with category sidebar and search |
| `/shop/:slug` | Product detail — gallery, variants/models, add to cart |
| `/shop/cart` | Shopping bag |
| `/shop/checkout` | Checkout (Algeria — DZD, COD or Chargily) |
| `/shop/order` | Store order status lookup |
| `/legal/terms` | Terms of service |
| `/legal/privacy` | Privacy policy |
| `/admin-panel` | Staff administration (authenticated) |

---

## Main website (landing)

The homepage introduces **EmbeddedGrid** as a lab focused on dependable embedded products and honest engineering.

**Enterprise pillars**

- Sector leadership in electronics, firmware, and connected products  
- Trusted service — clear communication and reliable delivery  
- Innovation — from bare-metal MCUs to cloud dashboards and mobile apps  

**Services highlighted**

- Embedded systems engineering (firmware, PCB bring-up, sensors)  
- IoT and connected platforms (MQTT, OTA, device-to-cloud)  
- Android and companion apps  
- Technical consulting  
- Open **project portfolio** (`/projects`)  
- **Parts & kits store** (`/store`) for Algeria  

**Contact**

- Email, Discord, WhatsApp quick links  
- Contact form with optional reCAPTCHA  
- Link to full **command** flow for project quotes with layers and tracking  

---

## Project lab

Each project can include:

- **Cover image** (cards/listings) and **schematic** (detail page)  
- Description, libraries, and **multiple code files** (viewable in-browser)  
- **ZIP download** of all code files plus 3D model  
- **Bill of materials** with links to store products where configured  
- Wiring table, simulation embed (Wokwi, Tinkercad, etc.)  
- **3D hardware preview** (GLB viewer with zoom controls)  
- Video embed (YouTube, Vimeo, etc.)  
- Comments and featured/free flags  
- Access gated by **subscription packs** for premium content  

Staff upload projects via the admin panel, including code by typing or file upload, STEP/GLB 3D models, and cover/schematic images separately.

---

## Commands (custom projects)

Clients describe an embedded or IoT need without requiring an account (guest flow supported). Logged-in users link commands to their account.

**Flow**

1. Client submits command with description and optional layers (hardware, firmware, etc.)  
2. Staff review, quote (USD and/or DZD), and update status  
3. Client tracks progress on `/track` via tracking code or email  
4. Payment via **Stripe** (international USD) or **Chargily** (Algeria DZD) when quoted  

Statuses and messaging are managed in the admin panel.

---

## Subscriptions

Subscription **packs** bundle access to premium projects. Users subscribe through the subscriptions page; payment routing follows region (Stripe vs Chargily). Active subscriptions unlock gated project content on the lab.

---

## Store (Algeria)

The store is **available to visitors detected as being in Algeria** (geo + fallback for local development). Prices are in **DZD**.

### Store home (`/store`)

- Full-width image carousel with manual arrows and auto-advance  
- Trending / featured products  
- Brand shortcuts  
- Full contact section (same pattern as main site)  

### Shop (`/shop`)

- Hierarchical **categories** (e.g. Embedded → Controllers, Sensors; PC Parts → Storage, Memory)  
- Product search  
- Product cards with image, category, description, price, add-to-bag  
- **Product variants/models** (e.g. cable male/female, sensor I2C) with text and optional images  

### Checkout

- Cart and checkout flow  
- Pay on delivery or card via **Chargily** (Edahabia / CIB)  
- Order tracking on `/shop/order`  
- Shipping aligned with Algeria wilayas and postal codes  

---

## User accounts

- Email/password and **Google Sign-In** (when configured)  
- Account page: profile, commands, store orders, subscriptions  
- Session-based API auth for lab and store features  

---

## Admin panel (`/admin-panel`)

Role-based staff access (granular permissions for superuser vs limited staff).

| Section | Capabilities |
|---------|----------------|
| **Dashboard** | Overview counts and quick links |
| **Projects** | Create/edit projects, code, materials, images, 3D, packs |
| **Categories** | Project category tree |
| **Commands** | Quote, status, messages, payment |
| **Comments** | Moderate project comments |
| **Packs** | Subscription pack pricing |
| **Store** | Categories (parent/child), products, variants, gallery, orders |
| **Customers** | User overview |
| **Economics** | Superuser revenue: Algeria vs non-Algeria; orders, commands, subscriptions; date range filter |
| **Messages** | Contact form inbox |
| **Staff & audit** | Staff users and activity log |
| **Legal** | Terms and privacy content |

Django admin (`/admin/`) remains available for low-level database access.

---

## Languages & accessibility

- **English** and **French** UI via i18n (`LocaleContext`)  
- Language switcher in site header  
- Light/dark **theme** toggle  
- Responsive layout for mobile and desktop  

---

## Payments & regions

| Region | Currency | Provider | Used for |
|--------|----------|----------|----------|
| Algeria | DZD | Chargily | Store, commands, subscriptions |
| International | USD | Stripe | Commands, subscriptions |

Geo detection uses headers, query hints, Cloudflare country, and optional `GEOIP_FALLBACK_COUNTRY`. Store catalog requires Algeria; lab and commands are global.

---

## Technology stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, React Router, Tailwind-style CSS variables |
| Backend | Django, Django REST Framework |
| Database | SQLite (local), PostgreSQL (Render) |
| 3D | trimesh + cascadio (STEP→GLB conversion), Three.js viewer |
| Deploy | Render.com (`render.yaml`, Gunicorn) |
| Media | Local `media/` or Cloudinary (production) |

---

## Local development

```cmd
installer.bat   REM first time
run.bat         REM daily — Vite :5173 + Django :8000
```

- Site: http://localhost:5173  
- API: http://127.0.0.1:8000/api/  
- Admin: http://127.0.0.1:8000/admin/  
- Store visible locally when `DEBUG=true` (Algeria fallback)  

See [README.md](./README.md) and [RENDER.md](./RENDER.md) for deployment and environment variables.

---

## Contact channels (public)

| Channel | Value |
|---------|--------|
| Email | lab@embeddedgrid.dev |
| Discord | https://discord.gg/embeddedgrid |
| WhatsApp | Configured via `WHATSAPP_SUPPORT_URL` |
| Project quotes | `/command` |

---

## Summary

EmbeddedGrid is both a **technical portfolio and commerce platform** for embedded engineering: it showcases real projects with code and 3D hardware, accepts custom client work through a tracked command system, monetizes premium content via subscriptions, and sells components and kits to customers in Algeria — managed end-to-end through a modern React front end and Django API.
