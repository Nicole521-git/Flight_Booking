import type { Collection, Db, Filter, ObjectId, OptionalId } from "mongodb";

export const SEED_VERSION = "2026-05-04_8_weeks_v2";
export const SEED_START_DATE = "2026-05-04";
export const SEED_WEEKS = 8;

export const TIME_ZONE_OPTIONS = [
  { label: "NZ GMT+12:00", value: "+12:00" },
  { label: "Sydney GMT+10:00", value: "+10:00" },
  { label: "Chatham GMT+12:45", value: "+12:45" }
] as const;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Aircraft = {
  id: string;
  model: string;
  seats: number;
  cabin: string;
};

type RouteTemplate = {
  service: string;
  routeCode: string;
  flightPrefix: string;
  aircraftId: string;
  days: number[];
  departureLocalTime: string;
  origin: string;
  originCode: string;
  originTimeZone: string;
  destination: string;
  destinationCode: string;
  destinationTimeZone: string;
  durationMinutes: number;
  priceNzd: number;
};

export type BookingDocument = {
  bookingReference: string;
  passengerId: ObjectId;
  passengerName: string;
  passengerEmail?: string;
  passengerGender?: string;
  passengerTitle?: string;
  seats: number;
  status: "confirmed" | "cancelled";
  bookedAt: Date;
  cancelledAt?: Date;
};

export type ScheduleDocument = {
  _id: ObjectId;
  seedVersion: string;
  flightNumber: string;
  service: string;
  routeCode: string;
  aircraft: Aircraft;
  origin: string;
  originCode: string;
  originTimeZone: string;
  destination: string;
  destinationCode: string;
  destinationTimeZone: string;
  dayOfWeek: string;
  departureLocalDate: string;
  departureLocalTime: string;
  arrivalLocalDate: string;
  arrivalLocalTime: string;
  departureUtc: Date;
  arrivalUtc: Date;
  durationMinutes: number;
  priceNzd: number;
  capacity: number;
  bookings: BookingDocument[];
  createdAt: Date;
};

export type PassengerDocument = {
  _id: ObjectId;
  name: string;
  normalizedName: string;
  email?: string;
  normalizedEmail?: string;
  gender?: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ScheduleSearchParams = {
  origin?: string | null;
  destination?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

const AIRCRAFT: Record<string, Aircraft> = {
  SJ30I: { id: "ZK-SJ30I", model: "SyberJet SJ30i", seats: 6, cabin: "Luxury" },
  SF50_A: { id: "ZK-SF50A", model: "Cirrus SF50", seats: 4, cabin: "Very light jet" },
  SF50_B: { id: "ZK-SF50B", model: "Cirrus SF50", seats: 4, cabin: "Very light jet" },
  HA420_A: { id: "ZK-HJETA", model: "HondaJet Elite", seats: 5, cabin: "Light jet" },
  HA420_B: { id: "ZK-HJETB", model: "HondaJet Elite", seats: 5, cabin: "Light jet" }
};

const ROUTES: RouteTemplate[] = [
  {
    service: "Sydney Prestige",
    routeCode: "DF-SYD",
    flightPrefix: "SJ",
    aircraftId: "SJ30I",
    days: [5],
    departureLocalTime: "09:00",
    origin: "Dairy Flat",
    originCode: "NZNE",
    originTimeZone: "+12:00",
    destination: "Sydney",
    destinationCode: "YSSY",
    destinationTimeZone: "+10:00",
    durationMinutes: 225,
    priceNzd: 3200
  },
  {
    service: "Sydney Prestige",
    routeCode: "SYD-DF",
    flightPrefix: "SJ",
    aircraftId: "SJ30I",
    days: [0],
    departureLocalTime: "15:00",
    origin: "Sydney",
    originCode: "YSSY",
    originTimeZone: "+10:00",
    destination: "Dairy Flat",
    destinationCode: "NZNE",
    destinationTimeZone: "+12:00",
    durationMinutes: 195,
    priceNzd: 3200
  },
  {
    service: "Rotorua Shuttle AM",
    routeCode: "DF-ROT-AM",
    flightPrefix: "CR",
    aircraftId: "SF50_A",
    days: [1, 2, 3, 4, 5],
    departureLocalTime: "07:30",
    origin: "Dairy Flat",
    originCode: "NZNE",
    originTimeZone: "+12:00",
    destination: "Rotorua",
    destinationCode: "NZRO",
    destinationTimeZone: "+12:00",
    durationMinutes: 45,
    priceNzd: 420
  },
  {
    service: "Rotorua Shuttle AM Return",
    routeCode: "ROT-DF-AM",
    flightPrefix: "CR",
    aircraftId: "SF50_A",
    days: [1, 2, 3, 4, 5],
    departureLocalTime: "08:45",
    origin: "Rotorua",
    originCode: "NZRO",
    originTimeZone: "+12:00",
    destination: "Dairy Flat",
    destinationCode: "NZNE",
    destinationTimeZone: "+12:00",
    durationMinutes: 50,
    priceNzd: 420
  },
  {
    service: "Rotorua Shuttle PM",
    routeCode: "DF-ROT-PM",
    flightPrefix: "CR",
    aircraftId: "SF50_B",
    days: [1, 2, 3, 4, 5],
    departureLocalTime: "17:30",
    origin: "Dairy Flat",
    originCode: "NZNE",
    originTimeZone: "+12:00",
    destination: "Rotorua",
    destinationCode: "NZRO",
    destinationTimeZone: "+12:00",
    durationMinutes: 45,
    priceNzd: 420
  },
  {
    service: "Rotorua Shuttle PM Return",
    routeCode: "ROT-DF-PM",
    flightPrefix: "CR",
    aircraftId: "SF50_B",
    days: [1, 2, 3, 4, 5],
    departureLocalTime: "18:45",
    origin: "Rotorua",
    originCode: "NZRO",
    originTimeZone: "+12:00",
    destination: "Dairy Flat",
    destinationCode: "NZNE",
    destinationTimeZone: "+12:00",
    durationMinutes: 50,
    priceNzd: 420
  },
  {
    service: "Great Barrier Island",
    routeCode: "DF-GBI",
    flightPrefix: "GB",
    aircraftId: "SF50_A",
    days: [1, 3, 5],
    departureLocalTime: "10:30",
    origin: "Dairy Flat",
    originCode: "NZNE",
    originTimeZone: "+12:00",
    destination: "Great Barrier Island",
    destinationCode: "NZGB",
    destinationTimeZone: "+12:00",
    durationMinutes: 30,
    priceNzd: 360
  },
  {
    service: "Great Barrier Island",
    routeCode: "GBI-DF",
    flightPrefix: "GB",
    aircraftId: "SF50_A",
    days: [2, 4, 6],
    departureLocalTime: "10:30",
    origin: "Great Barrier Island",
    originCode: "NZGB",
    originTimeZone: "+12:00",
    destination: "Dairy Flat",
    destinationCode: "NZNE",
    destinationTimeZone: "+12:00",
    durationMinutes: 35,
    priceNzd: 360
  },
  {
    service: "Chatham Islands",
    routeCode: "DF-CHT",
    flightPrefix: "CH",
    aircraftId: "HA420_A",
    days: [2, 5],
    departureLocalTime: "08:45",
    origin: "Dairy Flat",
    originCode: "NZNE",
    originTimeZone: "+12:00",
    destination: "Chatham Islands",
    destinationCode: "NZCI",
    destinationTimeZone: "+12:45",
    durationMinutes: 150,
    priceNzd: 1850
  },
  {
    service: "Chatham Islands",
    routeCode: "CHT-DF",
    flightPrefix: "CH",
    aircraftId: "HA420_A",
    days: [3, 6],
    departureLocalTime: "11:00",
    origin: "Chatham Islands",
    originCode: "NZCI",
    originTimeZone: "+12:45",
    destination: "Dairy Flat",
    destinationCode: "NZNE",
    destinationTimeZone: "+12:00",
    durationMinutes: 165,
    priceNzd: 1850
  },
  {
    service: "Lake Tekapo",
    routeCode: "DF-TKP",
    flightPrefix: "LT",
    aircraftId: "HA420_B",
    days: [1],
    departureLocalTime: "12:30",
    origin: "Dairy Flat",
    originCode: "NZNE",
    originTimeZone: "+12:00",
    destination: "Lake Tekapo",
    destinationCode: "NZTL",
    destinationTimeZone: "+12:00",
    durationMinutes: 105,
    priceNzd: 1250
  },
  {
    service: "Lake Tekapo",
    routeCode: "TKP-DF",
    flightPrefix: "LT",
    aircraftId: "HA420_B",
    days: [2],
    departureLocalTime: "13:30",
    origin: "Lake Tekapo",
    originCode: "NZTL",
    originTimeZone: "+12:00",
    destination: "Dairy Flat",
    destinationCode: "NZNE",
    destinationTimeZone: "+12:00",
    durationMinutes: 115,
    priceNzd: 1250
  }
];

export function parseTimeZoneOffset(timeZone = "+12:00") {
  const match = timeZone.match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/);

  if (!match) {
    throw new Error("Invalid timezone offset");
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");

  if (hours > 14 || minutes > 59) {
    throw new Error("Invalid timezone offset");
  }

  return sign * (hours * 60 + minutes);
}

export function normalizeTimeZone(timeZone?: string | null) {
  const minutes = parseTimeZoneOffset(timeZone?.trim() || "+12:00");
  const sign = minutes < 0 ? "-" : "+";
  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60).toString().padStart(2, "0");
  const mins = (absoluteMinutes % 60).toString().padStart(2, "0");

  return `${sign}${hours}:${mins}`;
}

export function normalizePersonValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function getBookedSeats(schedule: Pick<ScheduleDocument, "bookings">) {
  return (schedule.bookings ?? [])
    .filter((booking) => booking.status === "confirmed")
    .reduce((total, booking) => total + (booking.seats || 1), 0);
}

export function generateBookingReference() {
  return `DFJ-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function localDateTimeToUtc(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const offsetMinutes = parseTimeZoneOffset(timeZone);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes) - offsetMinutes * 60_000);
}

function utcToLocalParts(date: Date, timeZone: string) {
  const offsetMinutes = parseTimeZoneOffset(timeZone);
  const local = new Date(date.getTime() + offsetMinutes * 60_000);

  return {
    date: toDateOnly(local),
    time: `${local.getUTCHours().toString().padStart(2, "0")}:${local
      .getUTCMinutes()
      .toString()
      .padStart(2, "0")}`
  };
}

function createSchedule(template: RouteTemplate, date: Date, sequence: number) {
  const departureLocalDate = toDateOnly(date);
  const departureUtc = localDateTimeToUtc(
    departureLocalDate,
    template.departureLocalTime,
    template.originTimeZone
  );
  const arrivalUtc = new Date(departureUtc.getTime() + template.durationMinutes * 60_000);
  const arrival = utcToLocalParts(arrivalUtc, template.destinationTimeZone);
  const aircraft = AIRCRAFT[template.aircraftId];

  return {
    seedVersion: SEED_VERSION,
    flightNumber: `${template.flightPrefix}${sequence.toString().padStart(3, "0")}`,
    service: template.service,
    routeCode: template.routeCode,
    aircraft,
    origin: template.origin,
    originCode: template.originCode,
    originTimeZone: normalizeTimeZone(template.originTimeZone),
    destination: template.destination,
    destinationCode: template.destinationCode,
    destinationTimeZone: normalizeTimeZone(template.destinationTimeZone),
    dayOfWeek: DAYS[date.getUTCDay()],
    departureLocalDate,
    departureLocalTime: template.departureLocalTime,
    arrivalLocalDate: arrival.date,
    arrivalLocalTime: arrival.time,
    departureUtc,
    arrivalUtc,
    durationMinutes: template.durationMinutes,
    priceNzd: template.priceNzd,
    capacity: aircraft.seats,
    bookings: [],
    createdAt: new Date()
  };
}

export function buildSeedSchedules(): OptionalId<ScheduleDocument>[] {
  const start = new Date(`${SEED_START_DATE}T00:00:00.000Z`);
  const totalDays = SEED_WEEKS * 7;
  const schedules = [];
  let sequence = 1;

  for (let offset = 0; offset < totalDays; offset += 1) {
    const date = addDays(start, offset);
    const day = date.getUTCDay();

    for (const route of ROUTES) {
      if (route.days.includes(day)) {
        schedules.push(createSchedule(route, date, sequence));
        sequence += 1;
      }
    }
  }

  return schedules;
}

export async function ensureScheduleSeeded(db: Db) {
  const schedules = db.collection("schedules") as Collection<ScheduleDocument>;
  const seedCount = await schedules.countDocuments({ seedVersion: SEED_VERSION });

  if (seedCount > 0) {
    return;
  }

  const documents = buildSeedSchedules();
  await schedules.deleteMany({ seedVersion: SEED_VERSION });
  await db.collection("schedules").insertMany(documents);

  await schedules.createIndex({ seedVersion: 1, departureUtc: 1 });
  await schedules.createIndex({ origin: "text", destination: "text", originCode: 1, destinationCode: 1 });
  await schedules.createIndex({ "bookings.bookingReference": 1 }, { sparse: true });
  await db.collection("passengers").createIndex(
    { normalizedName: 1, normalizedEmail: 1 },
    { unique: false }
  );
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildScheduleFilter(params: ScheduleSearchParams) {
  const filter: Filter<ScheduleDocument> = { seedVersion: SEED_VERSION };

  if (params.origin?.trim()) {
    const value = escapeRegex(params.origin.trim());
    filter.$or = [
      { origin: { $regex: value, $options: "i" } },
      { originCode: { $regex: `^${value}$`, $options: "i" } }
    ];
  }

  if (params.destination?.trim()) {
    const value = escapeRegex(params.destination.trim());
    const destinationOr = [
      { destination: { $regex: value, $options: "i" } },
      { destinationCode: { $regex: `^${value}$`, $options: "i" } }
    ];

    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: destinationOr }];
      delete filter.$or;
    } else {
      filter.$or = destinationOr;
    }
  }

  const from = params.dateFrom?.trim() || SEED_START_DATE;
  const to = params.dateTo?.trim() || addDays(new Date(`${SEED_START_DATE}T00:00:00.000Z`), SEED_WEEKS * 7 - 1)
    .toISOString()
    .slice(0, 10);

  filter.departureLocalDate = { $gte: from, $lte: to };

  return filter;
}

export function serializeSchedule(schedule: ScheduleDocument) {
  const bookedSeats = getBookedSeats(schedule);

  return {
    ...schedule,
    _id: schedule._id.toString(),
    departureUtc: schedule.departureUtc.toISOString(),
    arrivalUtc: schedule.arrivalUtc.toISOString(),
    bookings: schedule.bookings.map((booking) => ({
      ...booking,
      passengerId: booking.passengerId.toString(),
      bookedAt: booking.bookedAt.toISOString(),
      cancelledAt: booking.cancelledAt?.toISOString()
    })),
    bookedSeats,
    availableSeats: Math.max(schedule.capacity - bookedSeats, 0)
  };
}
