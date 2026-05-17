import { getDb } from "@/lib/mongodb";
import {
  buildScheduleFilter,
  ensureScheduleSeeded,
  ScheduleDocument,
  serializeSchedule
} from "@/lib/flightSchedule";
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

    const schedules = (await db
      .collection<ScheduleDocument>("schedules")
      .find(filters)
      .sort({ departureUtc: 1 })
      .toArray()) as ScheduleDocument[];

    return NextResponse.json(schedules.map(serializeSchedule));
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
