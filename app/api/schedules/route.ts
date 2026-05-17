import { getDb } from "@/lib/mongodb";
import {
  buildScheduleFilter,
  ensureScheduleSeeded,
  generateBookingReference,
  getBookedSeats,
  normalizePersonValue,
  PassengerDocument,
  ScheduleDocument,
  serializeSchedule
} from "@/lib/flightSchedule";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const db = await getDb();
    await ensureScheduleSeeded(db);

    const filters = buildScheduleFilter({
      origin: searchParams.get("origin"),
      destination: searchParams.get("destination"),
      dateFrom: searchParams.get("dateFrom") || searchParams.get("date"),
      dateTo: searchParams.get("dateTo") || searchParams.get("date")
    });

    const schedules = await db
      .collection<ScheduleDocument>("schedules")
      .find(filters)
      .sort({ departureUtc: 1 })
      .toArray();

    return NextResponse.json(schedules.map(serializeSchedule));
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const flightId = String(body.flightId || "");
    const passengerName = String(body.passengerName || "").trim().replace(/\s+/g, " ");
    const passengerEmail = String(body.passengerEmail || "").trim().toLowerCase();
    const passengerGender = String(body.passengerGender || "").trim().toLowerCase();
    const seats = Math.max(1, Number(body.seats || 1));
    const companions = Array.isArray(body.companions) ? body.companions : [];

    if (!flightId || !passengerName) {
      return NextResponse.json({ error: "Flight and passenger name are required" }, { status: 400 });
    }

    if (!["male", "female", "other", "not_specified"].includes(passengerGender)) {
      return NextResponse.json({ error: "Passenger gender is required" }, { status: 400 });
    }

    if (!ObjectId.isValid(flightId)) {
      return NextResponse.json({ error: "Invalid flight ID" }, { status: 400 });
    }

    if (seats > 6) {
      return NextResponse.json({ error: "A single booking can reserve at most 6 seats" }, { status: 400 });
    }

    const db = await getDb();
    await ensureScheduleSeeded(db);

    const schedules = db.collection<ScheduleDocument>("schedules");
    const passengers = db.collection<PassengerDocument>("passengers");
    const schedule = await schedules.findOne({ _id: new ObjectId(flightId) });

    if (!schedule) {
      return NextResponse.json({ error: "Flight not found" }, { status: 404 });
    }

    if (getBookedSeats(schedule) + seats > schedule.capacity) {
      return NextResponse.json({ error: "No seats available on this flight" }, { status: 409 });
    }

    const now = new Date();
    const normalizedName = normalizePersonValue(passengerName);
    const normalizedEmail = passengerEmail || undefined;
    const passengerResult = await passengers.findOneAndUpdate(
      {
        normalizedName,
        ...(normalizedEmail ? { normalizedEmail } : {})
      },
      {
        $set: {
          name: passengerName,
          email: passengerEmail || undefined,
          gender: passengerGender,
          normalizedName,
          normalizedEmail,
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true, returnDocument: "after" }
    );

    if (!passengerResult) {
      return NextResponse.json({ error: "Could not save passenger" }, { status: 500 });
    }

    let bookingReference = generateBookingReference();
    while (await schedules.findOne({ "bookings.bookingReference": bookingReference })) {
      bookingReference = generateBookingReference();
    }

    const booking = {
      bookingReference,
      passengerId: passengerResult._id,
      passengerName,
      ...(passengerEmail ? { passengerEmail } : {}),
      passengerGender,
      seats,
      companions,
      status: "confirmed" as const,
      bookedAt: now
    };

    const result = await schedules.updateOne(
      {
        _id: schedule._id,
        $expr: {
          $lte: [
            {
              $add: [
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
                seats
              ]
            },
            "$capacity"
          ]
        }
      },
      { $push: { bookings: booking } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "No seats available on this flight" }, { status: 409 });
    }

    const updatedSchedule = await schedules.findOne({ _id: schedule._id });

    return NextResponse.json({
      message: "Booking successful",
      bookingReference,
      schedule: updatedSchedule ? serializeSchedule(updatedSchedule) : null,
      invoice: {
        bookingReference,
        passengerName,
        origin: schedule.origin,
        destination: schedule.destination,
        departureTime: schedule.departureUtc,
        arrivalTime: schedule.arrivalUtc,
        seats,
        companions,
        pricePerSeat: schedule.priceNzd,
        totalPrice: seats * schedule.priceNzd
      }
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
