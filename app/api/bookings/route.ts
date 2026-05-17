import { getDb } from "@/lib/mongodb";
import {
  ensureScheduleSeeded,
  normalizePersonValue,
  ScheduleDocument,
  serializeSchedule
} from "@/lib/flightSchedule";
import { NextRequest, NextResponse } from "next/server";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const passengerName = searchParams.get("passengerName")?.trim();
    const passengerEmail = searchParams.get("passengerEmail")?.trim().toLowerCase();

    if (!passengerName && !passengerEmail) {
      return NextResponse.json(
        { error: "Passenger name or email is required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    await ensureScheduleSeeded(db);

    const bookingMatch: Record<string, unknown> = { "bookings.status": "confirmed" };

    if (passengerName) {
      bookingMatch["bookings.passengerName"] = {
        $regex: `^${escapeRegex(passengerName.replace(/\s+/g, " "))}$`,
        $options: "i"
      };
    }

    if (passengerEmail) {
      bookingMatch["bookings.passengerEmail"] = normalizePersonValue(passengerEmail);
    }

    const schedules = await db
      .collection<ScheduleDocument>("schedules")
      .find(bookingMatch)
      .sort({ departureUtc: 1 })
      .toArray();

    const bookings = schedules.flatMap((schedule) =>
      schedule.bookings
        .filter((booking) => {
          if (booking.status !== "confirmed") {
            return false;
          }

          const nameMatches = passengerName
            ? normalizePersonValue(booking.passengerName) === normalizePersonValue(passengerName)
            : true;
          const emailMatches = passengerEmail
            ? normalizePersonValue(booking.passengerEmail || "") === normalizePersonValue(passengerEmail)
            : true;

          return nameMatches && emailMatches;
        })
        .map((booking) => ({
          ...booking,
          passengerId: booking.passengerId.toString(),
          bookedAt: booking.bookedAt.toISOString(),
          cancelledAt: booking.cancelledAt?.toISOString(),
          schedule: serializeSchedule(schedule)
        }))
    );

    return NextResponse.json(bookings);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingReference = searchParams.get("bookingReference")?.trim();

    if (!bookingReference) {
      return NextResponse.json({ error: "Booking reference is required" }, { status: 400 });
    }

    const db = await getDb();
    await ensureScheduleSeeded(db);

    const result = await db.collection<ScheduleDocument>("schedules").updateOne(
      {
        "bookings.bookingReference": bookingReference,
        "bookings.status": "confirmed"
      },
      {
        $set: {
          "bookings.$.status": "cancelled",
          "bookings.$.cancelledAt": new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Booking cancelled", bookingReference });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
