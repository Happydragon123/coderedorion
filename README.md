# Campus Food Rescue

**Good food. Shared locally.**

Campus Food Rescue connects surplus food with people nearby. Built around the University of Houston campus, it gives students and campus organizers a place to share available food, find a pickup location, and reserve a portion before the pickup window ends.

The goal is simple: make it easier for extra food from campus events and gatherings to reach someone who can enjoy it.

## How it works

### Share surplus food

1. Create an account or sign in, then open **Share food**.
2. Add a food photo and description. Optional AI assistance can help draft the title and description.
3. Choose a campus pickup location and enter the number of portions, pickup instructions, and deadline.
4. Review the details and add any dietary, ingredient, or allergen information you can confirm before publishing.
5. Use **Manage food** to track reservations and confirm collection when someone presents their pickup code.

The person sharing food reviews and publishes every listing. AI assistance never publishes a post automatically.

### Find and collect food

1. Sign in and browse the food feed, using a campus landmark or optional device location to find nearby options.
2. Filter by location and dietary preference, or describe what you want in the natural-language search.
3. Open a listing to check its photo, available portions, pickup instructions, and deadline.
4. Reserve one portion and find your pickup code in **My pickups**.
5. Arrive before the deadline and show your code to the person sharing the food, who confirms the collection.

If your plans change, you can cancel an uncollected reservation. The same account can both share food and reserve portions from other people.

## Features

- **Food listings:** Photos, descriptions, portion counts, pickup deadlines, and sharing names help people understand what is being offered.
- **Campus pickup map:** Nine verified University of Houston locations provide familiar meeting landmarks and external directions. The home map is visible before sign-in; food availability appears for signed-in users.
- **One-portion reservations:** Each person reserves one portion per listing, with a private pickup code for collection.
- **Pickup management:** People sharing food can view reservations, close a listing to new claims, and confirm handoffs.
- **AI-assisted posting:** Google Gemini can suggest an editable title and description from a photo or written description. The person posting supplies the location, quantity, pickup instructions, and deadline.
- **Natural-language search:** Requests such as “vegetarian food near the library” are translated into supported filters and matched against current listings.
- **Dietary information:** Listings support vegetarian, vegan, halal, and gluten-free tags supplied by the person sharing the food.
- **Campus impact:** The impact page distinguishes posted portions, active reservations, and confirmed collections.
- **Account profiles:** Members can update their display name and optional organization name, which appear on their food posts.

## What happens to a reservation?

Reservations are available only while a listing is open, has portions remaining, and has a future pickup deadline. A person cannot reserve their own listing.

Cancelling a reservation makes its portion available again when the listing is still open and within its pickup window. Closing a listing stops new reservations while allowing existing reservations to be collected before the deadline. Once the deadline passes, uncollected reservations expire.

Only the person sharing the food can confirm collection using the pickup code. A confirmed collection is counted once, even if confirmation is repeated.

## Understanding food information and impact

Dietary tags and ingredient or allergen notes come from the person posting. Missing information means it is unconfirmed. AI does not verify ingredients, allergens, or food safety, and a dietary tag is not an allergy-safe guarantee.

Map pins identify pickup landmarks; they do not guarantee food is available at every location. Displayed distances are straight-line distances, and pickup times use the campus time zone, **America/Chicago**.

Impact totals count confirmed collections separately from posts and reservations. Weight and meal-equivalent figures are estimates based on fixed portion assumptions, rather than measured food weight. Any pickups made with synthetic demo listings are simulations and should not be presented as real food rescued.

## Quick walkthrough

Use two accounts to try the complete sharing and pickup flow:

1. With the first account, publish a clearly labeled demo listing with a permitted matching photo, one portion, a campus location, and a future deadline.
2. With the second account, find the listing and reserve its portion.
3. Open **My pickups** to view the pickup code.
4. With the first account, enter that code in **Manage food** to confirm collection.
5. View **Impact** to see the confirmed collection reflected in the totals.

Demo listings should explicitly state that no real food is offered and no travel is needed. Existing demo posts may have expired; check their deadlines before a walkthrough.

## Technologies

| Technology | Role |
| --- | --- |
| Next.js and React | Web application and user interface |
| TypeScript | Typed application code |
| Supabase | Accounts, database, and private photo storage |
| Google Gemini | Optional listing drafts and natural-language search |
| Leaflet and OpenStreetMap data | Campus maps |
| Zod | Validation of application data |

## Run locally

Use **Node.js 22 or later** and **npm**.

```sh
npm ci
```

If you do not already have a `.env.local` file, copy the environment template:

```sh
cp .env.example .env.local
```

Add your configuration to `.env.local`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase public application key |
| `GEMINI_API_KEY` | Optional server-side key for AI features |
| `GEMINI_MODEL` | Model identifier available to your Gemini account |
| `NEXT_PUBLIC_MAP_TILE_URL` | Optional tile provider for the food-feed map |
| `NEXT_PUBLIC_MAP_ATTRIBUTION` | Attribution required by the selected tile provider |

Supabase must have the project's database migrations, private photo storage, verified pickup locations, and authentication redirects configured. See [database setup](docs/database.md), [account setup](docs/account-profiles.md), and [required listing photos](docs/required-photos.md) for detailed instructions.

```sh
npm run dev
```

Open [localhost:3000](http://localhost:3000). Restart the server after changing environment variables. Keep `.env.local` and private provider keys out of version control.

AI features are optional: manual posting and standard filters work without Gemini. Manual campus location selection remains available when device location is denied. The food list and directions remain usable without map tiles, and the home campus map needs no tile-provider key.

To run the project's local checks:

```sh
npm run check
```

This runs linting, type checking, tests, and a production build. Tests that require a live database are opt-in.
