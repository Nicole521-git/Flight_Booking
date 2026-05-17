import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

const root = process.cwd();
const csvPath = path.join(root, "randomnames.csv");
const envPath = path.join(root, ".env.local");
const passengerLimit = Number(process.env.TEST_PASSENGER_LIMIT || 40);

function loadEnv() {
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local was not found");
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^([^#=\s]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function normalizePersonValue(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeGender(value) {
  if (value === "m") {
    return "male";
  }

  if (value === "f") {
    return "female";
  }

  return "not_specified";
}

function getPassengers() {
  if (!fs.existsSync(csvPath)) {
    throw new Error("randomnames.csv was not found");
  }

  return fs
    .readFileSync(csvPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map(parseCsvLine)
    .filter((row) => row.length >= 6)
    .map(([sourceId, title, firstName, lastName, gender, email]) => ({
      sourceId,
      title,
      firstName,
      lastName,
      gender,
      email: email.toLowerCase(),
      name: `${firstName} ${lastName}`.replace(/\s+/g, " ").trim()
    }))
    .filter((passenger) => passenger.name && passenger.email)
    .slice(0, passengerLimit);
}

function bookingReference(index) {
  return `DFJ-CSV${String(index + 1).padStart(4, "0")}-TEST`;
}

async function main() {
  loadEnv();

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from .env.local");
  }

  const dbName = process.env.DB_NAME || "flight_booking";
  const passengersFromCsv = getPassengers();

  if (passengersFromCsv.length === 0) {
    throw new Error("No passenger rows could be read from randomnames.csv");
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  try {
    const db = client.db(dbName);
    const schedules = db.collection("schedules");
    const passengers = db.collection("passengers");
    const now = new Date();

    const availableSchedules = await schedules
      .find({ seedVersion: "2026-05-04_8_weeks_v2" })
      .sort({ departureUtc: 1 })
      .toArray();

    if (availableSchedules.length === 0) {
      throw new Error("No seeded schedules found. Import the schedule data before running this script.");
    }

    let scheduleIndex = 0;
    let insertedBookings = 0;
    let skippedBookings = 0;

    for (let i = 0; i < passengersFromCsv.length; i += 1) {
      const csvPassenger = passengersFromCsv[i];
      const normalizedName = normalizePersonValue(csvPassenger.name);
      const normalizedEmail = normalizePersonValue(csvPassenger.email);
      const passengerGender = normalizeGender(csvPassenger.gender);

      const passengerResult = await passengers.findOneAndUpdate(
        { normalizedName, normalizedEmail },
        {
          $set: {
            source: "randomnames.csv",
            sourceId: csvPassenger.sourceId,
            title: csvPassenger.title,
            firstName: csvPassenger.firstName,
            lastName: csvPassenger.lastName,
            gender: passengerGender,
            name: csvPassenger.name,
            email: csvPassenger.email,
            normalizedName,
            normalizedEmail,
            updatedAt: now
          },
          $setOnInsert: { createdAt: now }
        },
        { upsert: true, returnDocument: "after" }
      );

      const reference = bookingReference(i);
      const alreadyBooked = await schedules.findOne({ "bookings.bookingReference": reference });

      if (alreadyBooked) {
        await schedules.updateOne(
          { "bookings.bookingReference": reference },
          {
            $set: {
              "bookings.$.passengerGender": passengerGender,
              "bookings.$.passengerTitle": csvPassenger.title
            }
          }
        );
        skippedBookings += 1;
        continue;
      }

      let booked = false;

      for (let attempts = 0; attempts < availableSchedules.length; attempts += 1) {
        const schedule = availableSchedules[scheduleIndex % availableSchedules.length];
        scheduleIndex += 1;

        const confirmedSeats = (schedule.bookings || [])
          .filter((booking) => booking.status === "confirmed")
          .reduce((total, booking) => total + (booking.seats || 1), 0);

        if (confirmedSeats >= schedule.capacity) {
          continue;
        }

        const result = await schedules.updateOne(
          {
            _id: schedule._id,
            "bookings.bookingReference": { $ne: reference },
            $expr: {
              $lt: [
                {
                  $sum: {
                    $map: {
                      input: "$bookings",
                      as: "booking",
                      in: {
                        $cond: [
                          { $eq: ["$$booking.status", "confirmed"] },
                          { $ifNull: ["$$booking.seats", 1] },
                          0
                        ]
                      }
                    }
                  }
                },
                "$capacity"
              ]
            }
          },
          {
            $push: {
              bookings: {
                bookingReference: reference,
                passengerId: passengerResult._id,
                passengerName: csvPassenger.name,
                passengerEmail: csvPassenger.email,
                passengerGender,
                passengerTitle: csvPassenger.title,
                seats: 1,
                status: "confirmed",
                bookedAt: now,
                source: "randomnames.csv"
              }
            }
          }
        );

        if (result.modifiedCount === 1) {
          insertedBookings += 1;
          booked = true;
          break;
        }
      }

      if (!booked) {
        skippedBookings += 1;
      }
    }

    await schedules.createIndex({ "bookings.bookingReference": 1 }, { sparse: true });
    await passengers.createIndex({ normalizedName: 1, normalizedEmail: 1 });

    console.log(`Passengers upserted: ${passengersFromCsv.length}`);
    console.log(`Bookings inserted: ${insertedBookings}`);
    console.log(`Bookings skipped: ${skippedBookings}`);
    console.log(`Try searching bookings for: ${passengersFromCsv[0].name} / ${passengersFromCsv[0].email}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
