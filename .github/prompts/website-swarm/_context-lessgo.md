# Lessgo — shared product & brand context

> Read-only reference for the website swarm. Every persona should ground their
> advice in these facts. If something here looks out of date, **flag it** —
> don't silently assume.

## What Lessgo is
Lessgo is a mobile-first social app that makes planning hangouts with friends
effortless.

- **Tagline in use:** "Hangouts made easy."
- **Hero line in use:** "Party is on you, managing is on us."

It turns the messy group-chat chaos of *"who's in / where / when / who paid"*
into one place to:
- Create and discover **events** (parties, trips, dinners, concerts, workshops) with RSVP.
- Split and settle **expenses** across the group (who owes whom).
- Organize friend **groups** and lightweight hangout proposals (**"Buzz"**).
- Share spur-of-the-moment plans in a swipeable **"Vibes"** feed (contacts-only).

## Who it's for
- **Primary:** socially-active young people in **India** (Gen Z / young millennials)
  organizing plans *within existing friend circles*. The social graph is phone
  contacts — this is **not** a public/celebrity social network.
- Built with ❤️ in India. Android package id `com.lessgo.india`.

## Platforms & the website's job
- Native **iOS + Android** apps are the core product.
- The **website (this repo)** has two jobs:
  1. A **marketing site** that drives app installs.
  2. A lightweight **web client** for non-app users — shareable event deep
     links (`/e/:id`) with RSVP + phone-OTP onboarding, so an invited guest can
     act on a link without being forced to install.
- **Primary website goal:** drive qualified **app installs** (Play Store / App Store).
- **Secondary goals:** let invited guests RSVP on a shared link, explain the
  product, and build trust.

## Brand snapshot (current, evolvable)
- **Personality:** playful, warm, modern, friendly, effortless. Anti-corporate,
  pro-"just get the plan going."
- **Visual:** signature **gradient** (teal → blue → purple → magenta). Light
  base `#F1EEFF`, dark base `#0E0B24`. Rounded, soft, spacious. Ships light + dark themes.
- **Voice:** casual, energetic, second-person ("you"), low-friction. Emojis used sparingly.

## Current website (what exists today)
- **Stack:** Next.js 14 (App Router) + Tailwind CSS, deployed on Railway.
- **Analytics:** PostHog (EU region).
- **Marketing pages today:** Home, Discover, Help, Legal, What's New, Blog.
- **Web-client routes:** `/e/:id` (event deep link, server-rendered OG preview),
  `/onboarding` (phone OTP), `/me`.

## What this swarm is for
Design and specify a **brand-new marketing website for Lessgo** —
positioning, structure, design, copy, SEO, growth, legal, accessibility,
engineering, and measurement — so the team can build it with confidence.

## Constraints to respect
- **Install-first:** every page should make "get the app" easy without feeling spammy.
- **India-first** audience, globally understandable. Consider India's **DPDP Act 2023**
  plus GDPR-style expectations for privacy/consent.
- **Reuse** the existing Next.js + Tailwind stack unless there's a strong reason not to.
- **Mobile-first & fast** — the audience lives on phones; performance is non-negotiable.
- Sensitive surface: the app uses **phone contacts** and **phone-OTP** — treat
  permissions, trust, and privacy messaging as first-class.

## Rough competitive landscape (for differentiation, not copying)
Splitwise (expense-splitting), Partiful / Luma / Eventbrite (event invites &
discovery), plain WhatsApp groups (the status quo Lessgo replaces). Lessgo's
angle: **the whole hangout in one app — plan + RSVP + split + settle + vibe.**
