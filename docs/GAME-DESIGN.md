# Naija Hustle — Game Design

## Core fantasy

Start with very little and build a meaningful Nigerian life through choices, work, relationships, risk, and smart money management.

## Core loop

1. Check your needs, money, time, and opportunities.
2. Choose an action.
3. Spend time, energy, and/or money.
4. Receive a result, reward, consequence, or new opportunity.
5. Improve your situation.
6. Unlock better choices.

## Player state

The authoritative game state will eventually include:

- Identity and character
- Cash and bank balance
- Energy, hunger, health, and happiness
- Skills and education
- Reputation
- Current location
- Housing
- Transport
- Job/career
- Inventory
- Relationships
- Businesses and assets
- Game date/time

## Economy rules

The economy must be server-authoritative. The client never decides how much money a player owns or earns.

Every balance-changing event should have a traceable transaction record. Rewards, purchases, salaries, bills, transfers, and business income should be validated server-side.

## Abuja-first world

The first playable world uses Abuja as the geographic foundation. We will build a connected slice before attempting full-city detail.

Real geography can provide the structure; gameplay locations, NPCs, missions, and fictional businesses belong to the game.

## Progression

Poor → surviving → stable → comfortable → wealthy → influential.

Progression should create more choices rather than simply increasing numbers.

## Monetization

The core game should remain playable without paying.

Preferred future monetization:

- Cosmetic customization
- Premium housing/vehicle customization
- Optional convenience features that do not create unfair competitive advantages
- Sponsored in-world locations and advertising
- Brand/event partnerships
- Creator and business promotion

No pay-to-win economy.

## Technical principles

- Mobile-first
- TypeScript
- Next.js
- Separate Supabase project from EasyTasksz
- Strict Row Level Security when backend tables are introduced
- Server-authoritative economy
- Small, testable game systems
- Avoid building a 3D open world before the simulation loop is fun
