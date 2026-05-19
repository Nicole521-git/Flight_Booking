# Dairy Flat Airways Flight Booking

Online flight booking system for 159.352 Advanced Web Development Assignment 2.

The application lets customers search scheduled flights from the Dairy Flat Airways network, reserve seats, view a booking invoice/confirmation, retrieve all confirmed bookings for a passenger, and cancel bookings by reference.

## Deployment

Vercel deployment URL: **https://flightbooking111.vercel.app/**
            

## Tech Stack

- Next.js 16 App Router
- React 19
- MongoDB Atlas
- Tailwind CSS
- Vercel

## Environment Variables

Create `.env.local` in the project root:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
DB_NAME=flight_booking
```

`DB_NAME` is optional. If it is not set, the app uses `flight_booking`.

## Running Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

The schedule collection is seeded automatically the first time an API route is used. The current seed includes more than one week of real calendar dates and covers the Dairy Flat, Sydney, Rotorua, Great Barrier Island, Chatham Islands, and Lake Tekapo routes.

## Test Data

The repository includes `randomnames.csv` and a helper script to load sample passengers/bookings into MongoDB.

First start the app or call an API route once so the flight schedules are seeded, then run:

```bash
npm run seed:test
```

You can also verify the CSV can be read with:

```bash
python test_csv_loading.py
```

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
npm run seed:test
```

## Main Features

- Landing page for Dairy Flat Airways
- Flight search by origin, destination, and date range
- Scheduled flight selection and booking
- Seat capacity checks to prevent overbooking
- Unique booking reference generation
- Booking confirmation/invoice summary
- Passenger booking lookup by name or email
- Booking cancellation by passenger lookup or booking reference

## API Routes

- `GET /api/search` - search scheduled flights
- `GET /api/schedules` - list scheduled flights
- `POST /api/schedules` - create a booking
- `GET /api/bookings` - retrieve confirmed passenger bookings
- `DELETE /api/bookings` - cancel a booking by reference
