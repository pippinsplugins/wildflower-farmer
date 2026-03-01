# Wildflower Farmer

A web app for flower farmers to track planting schedules and seed batches from first plant to bloom. Manage varieties, growing locations, and planting batches through their full lifecycle with timestamped notes along the way.

## Features

- **Variety catalog** -- Track flower varieties with germination times, bloom days, spacing, light requirements, and pinching info
- **Location management** -- Organize beds, fields, hoop houses, and other growing spaces by zone and sun exposure
- **Batch lifecycle tracking** -- Follow each planting from planning through harvest with automatic date tracking at every stage
- **Auto-generated batch codes** -- Each batch gets a unique code like `2026-ZIN-001` based on variety and year
- **Visual timeline** -- See exactly where each batch is in its lifecycle at a glance
- **Quick status advancement** -- Single tap to move a batch to its next stage, with dates auto-populated
- **Batch notes** -- Attach timestamped observations, issues, milestones, weather notes, and pest reports to any batch
- **Dashboard** -- Overview of active batches by status, upcoming milestones based on expected germination/bloom timing, and recent activity
- **Filtering** -- Filter batches by status, variety, location, and season
- **Mobile-friendly** -- Bottom navigation bar, large touch targets, and responsive card layouts
- **Google OAuth login** -- Restricted to authorized email domains

### Batch Lifecycle

Each batch moves through these statuses:

```
planned -> seeded -> germinating -> growing -> transplanted -> budding -> blooming -> harvesting -> done
```

When you advance a batch to a new status, the corresponding date field is automatically set to today (you can edit it afterward). The dashboard uses these dates along with the variety's `days_to_germination`, `days_to_transplant`, and `days_to_bloom` fields to show upcoming milestones.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Server | Express.js |
| Database | SQLite via better-sqlite3 |
| Auth | Passport.js + Google OAuth 2.0 |
| Sessions | express-session + connect-sqlite3 |
| Templating | EJS (server-rendered) |
| Styling | Tailwind CSS (CDN) |
| Client JS | Vanilla JavaScript |

## Prerequisites

- **Node.js** 18 or later
- A **Google Cloud** project with OAuth 2.0 credentials

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/pippinsplugins/wildflower-farmer.git
cd wildflower-farmer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Google OAuth credentials

You need a Google Cloud project with OAuth 2.0 credentials. If you don't have one yet:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Select **Web application** as the application type
6. Set the **Authorized redirect URI** to:
   ```
   http://localhost:3001/auth/google/callback
   ```
   (Change the host/port if deploying elsewhere)
7. Copy the **Client ID** and **Client Secret**

### 4. Configure environment variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
SESSION_SECRET=a-long-random-string-here
ALLOWED_DOMAINS=williamsonwildflowers.com
PORT=3001
```

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret from Google Cloud Console |
| `SESSION_SECRET` | A random string used to sign session cookies. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ALLOWED_DOMAINS` | Comma-separated list of allowed email domains. Only Google accounts with emails ending in these domains can sign in. Leave empty to allow any Google account. |
| `PORT` | Port the server listens on (default: `3001`) |

### 5. Start the server

```bash
npm start
```

The app will be available at **http://localhost:3001**.

On first launch, the SQLite database is automatically created in the `data/` directory and all tables are set up. No manual migration step is needed.

For development with auto-restart on file changes:

```bash
npm run dev
```

## Usage

### First-time setup

1. Visit http://localhost:3001 -- you'll be redirected to the login page
2. Click **Sign in with Google** and authenticate with an account on your allowed domain
3. Start by adding a few **varieties** (the flower types you grow)
4. Add your **locations** (beds, fields, hoop houses)
5. Create your first **batch** by selecting a variety, optionally assigning a location, and setting the season/year

### Day-to-day workflow

- **Create batches** when you plan new plantings. They start in `planned` status.
- **Advance status** with a single click on the batch detail page as your plants progress. The corresponding date is recorded automatically.
- **Add notes** to batches as you go -- tag them as observations, issues, milestones, weather events, or pest sightings.
- **Check the dashboard** to see what's active, what's coming up, and recent activity.
- **Filter the batch list** by status, variety, or location to find what you need.

## Project Structure

```
wildflower-farmer/
├── server.js                    # Express entry point
├── db/
│   ├── database.js              # SQLite connection + initialization
│   └── schema.sql               # Table definitions and indexes
├── middleware/
│   └── auth.js                  # Passport config + requireAuth middleware
├── routes/
│   ├── auth.js                  # Google OAuth login/logout routes
│   ├── pages.js                 # HTML page routes (all protected)
│   ├── varieties.js             # /api/varieties CRUD
│   ├── locations.js             # /api/locations CRUD
│   ├── batches.js               # /api/batches CRUD + status advancement
│   └── notes.js                 # /api/batches/:id/notes
├── views/
│   ├── header.ejs               # Shared page header with navigation
│   ├── footer.ejs               # Shared page footer with mobile nav
│   ├── login.ejs                # Login page
│   ├── dashboard.ejs            # Home dashboard
│   ├── varieties/
│   │   ├── index.ejs            # Variety list with search
│   │   └── form.ejs             # Add/edit variety
│   ├── locations/
│   │   ├── index.ejs            # Location list with search
│   │   └── form.ejs             # Add/edit location
│   └── batches/
│       ├── index.ejs            # Batch list with filters
│       ├── detail.ejs           # Batch detail with timeline + notes
│       └── form.ejs             # Create/edit batch
├── public/
│   ├── css/app.css              # Custom styles (badges, timeline, cards)
│   └── js/app.js                # Client-side JS (modals, status updates, filtering)
└── data/                        # SQLite databases (gitignored)
```

## Database

The database is a single SQLite file at `data/wildflower.db`. Sessions are stored separately in `data/sessions.db`. Both are created automatically on first run and are gitignored.

### Tables

- **users** -- Google account info for authenticated users
- **varieties** -- Flower variety catalog with growing characteristics
- **locations** -- Growing spaces (beds, fields, etc.)
- **batches** -- Individual plantings linked to a variety and optionally a location, tracked through the full lifecycle
- **batch_notes** -- Timestamped, categorized notes attached to batches

### Backup

To back up your data, copy the `data/wildflower.db` file. The database uses WAL mode for better concurrent read performance.

## API Reference

All API endpoints require authentication. Responses are JSON.

### Varieties

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/varieties` | List all varieties |
| `GET` | `/api/varieties/:id` | Get a single variety |
| `POST` | `/api/varieties` | Create a variety (requires `name`) |
| `PUT` | `/api/varieties/:id` | Update a variety |
| `DELETE` | `/api/varieties/:id` | Delete a variety (fails if batches exist) |

### Locations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/locations` | List all locations |
| `GET` | `/api/locations/:id` | Get a single location |
| `POST` | `/api/locations` | Create a location (requires `name`) |
| `PUT` | `/api/locations/:id` | Update a location |
| `DELETE` | `/api/locations/:id` | Delete a location (fails if batches exist) |

### Batches

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/batches` | List batches (filterable, see below) |
| `GET` | `/api/batches/:id` | Get a single batch |
| `POST` | `/api/batches` | Create a batch (requires `variety_id`) |
| `PUT` | `/api/batches/:id` | Update a batch |
| `POST` | `/api/batches/:id/status` | Advance batch status (body: `{ "status": "seeded" }`) |
| `DELETE` | `/api/batches/:id` | Delete a batch and its notes |

**Batch list query parameters:** `status`, `variety_id`, `location_id`, `season`, `year`

### Batch Notes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/batches/:id/notes` | Add a note (requires `note_text`) |
| `DELETE` | `/api/batches/:batchId/notes/:noteId` | Delete a note |

Note categories: `observation`, `milestone`, `issue`, `weather`, `pest`

## Deployment Notes

- Set `cookie.secure` to `true` in `server.js` session config when running behind HTTPS
- Update the **Authorized redirect URI** in Google Cloud Console to match your production URL
- The SQLite database file will be created in the `data/` directory -- make sure this directory is persistent and writable in your deployment environment
- Session cookies expire after 1 week by default (configurable in `server.js`)

## License

Private -- all rights reserved.
