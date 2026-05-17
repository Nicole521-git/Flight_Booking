"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";

type EmbeddedBooking = {
  bookingReference: string;
  passengerName?: string;
  passengerEmail?: string;
  passengerGender?: string;
  passengerTitle?: string;
  seats?: number;
  companions?: { name: string; gender: string }[];
  status?: string;
  bookedAt?: string;
};

type Flight = {
  _id: string;
  flightNumber: string;
  service: string;
  routeCode: string;
  aircraft: {
    id: string;
    model: string;
    seats: number;
    cabin: string;
  };
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
  departureUtc: string;
  arrivalUtc: string;
  durationMinutes: number;
  priceNzd: number;
  capacity: number;
  bookings: EmbeddedBooking[];
  bookedSeats: number;
  availableSeats: number;
};

type Booking = EmbeddedBooking & {
  schedule: Flight;
};

type MessageTone = "info" | "success" | "error";

const firstSeedDate = "2026-05-04";
const defaultEndDate = "2026-05-17";

const airportOptions = [
  { label: "Any airport", value: "" },
  { label: "Dairy Flat, Auckland (NZNE)", value: "NZNE" },
  { label: "Sydney (YSSY)", value: "YSSY" },
  { label: "Rotorua (NZRO)", value: "NZRO" },
  { label: "Great Barrier Island (NZGB)", value: "NZGB" },
  { label: "Chatham Islands (NZCI)", value: "NZCI" },
  { label: "Lake Tekapo (NZTL)", value: "NZTL" }
];

const genderOptions = [
  { label: "Select gender", value: "" },
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
  { label: "Prefer not to say", value: "not_specified" }
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function money(value: number) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0
  }).format(value);
}

function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  return `${hours}h ${mins.toString().padStart(2, "0")}m`;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NZ", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(date);
}

function flightTime(flight: Flight) {
  return `${formatDate(flight.departureLocalDate)} ${flight.departureLocalTime} GMT${flight.originTimeZone}`;
}

function flightArrival(flight: Flight) {
  return `${formatDate(flight.arrivalLocalDate)} ${flight.arrivalLocalTime} GMT${flight.destinationTimeZone}`;
}

function seatsLabel(count: number) {
  return count === 1 ? "1 seat" : `${count} seats`;
}

function genderLabel(value?: string) {
  const option = genderOptions.find((item) => item.value === value);
  return option?.label ?? "Not provided";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function messageClass(tone: MessageTone) {
  if (tone === "success") {
    return "border-[#b8d8d2] bg-[#edf6f4] text-[#1e625d]";
  }

  if (tone === "error") {
    return "border-[#e7b8aa] bg-[#fff1ec] text-[#9d3030]";
  }

  return "border-[#ead49f] bg-[#fff8eb] text-[#7a4b12]";
}

export default function Home() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [origin, setOrigin] = useState("NZNE");
  const [destination, setDestination] = useState("");
  const [dateFrom, setDateFrom] = useState(firstSeedDate);
  const [dateTo, setDateTo] = useState(defaultEndDate);
  const [passengerName, setPassengerName] = useState("");
  const [passengerEmail, setPassengerEmail] = useState("");
  const [bookingName, setBookingName] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [bookingGender, setBookingGender] = useState("");
  const [companions, setCompanions] = useState<{ name: string; gender: string }[]>([]);
  const [seats, setSeats] = useState(1);
  const [cancelReference, setCancelReference] = useState("");
  const [flightMessage, setFlightMessage] = useState("");
  const [flightMessageTone, setFlightMessageTone] = useState<MessageTone>("info");
  const [reservationMessage, setReservationMessage] = useState("");
  const [reservationMessageTone, setReservationMessageTone] = useState<MessageTone>("info");
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingMessageTone, setBookingMessageTone] = useState<MessageTone>("info");
  const [cancelMessage, setCancelMessage] = useState("");
  const [cancelMessageTone, setCancelMessageTone] = useState<MessageTone>("info");
  const [lastReference, setLastReference] = useState("");
  const [loadingFlights, setLoadingFlights] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);

  function updateSeats(val: number) {
    const newCount = Math.max(1, val);
    setSeats(newCount);
    setCompanions((prev) => {
      const targetLen = newCount - 1;
      if (targetLen <= 0) return [];
      const next = [...prev];
      if (next.length > targetLen) return next.slice(0, targetLen);
      while (next.length < targetLen) {
        next.push({ name: "", gender: "" });
      }
      return next;
    });
  }

  const selectedFlightLabel = useMemo(() => {
    if (!selectedFlight) {
      return "Select a flight from the results to start a reservation.";
    }

    return `${selectedFlight.flightNumber} ${selectedFlight.originCode} to ${selectedFlight.destinationCode}`;
  }, [selectedFlight]);

  const resultsSummary = useMemo(() => {
    if (loadingFlights) {
      return "Searching the live schedule";
    }

    if (flights.length === 0) {
      return "No flights currently displayed";
    }

    return `${flights.length} scheduled ${flights.length === 1 ? "flight" : "flights"} found`;
  }, [flights.length, loadingFlights]);

  function getCurrentSearchParams() {
    const params = new URLSearchParams();

    if (origin) {
      params.set("origin", origin);
    }

    if (destination) {
      params.set("destination", destination);
    }

    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    }

    return params;
  }

  async function loadFlights(searchParams = getCurrentSearchParams()) {
    setLoadingFlights(true);
    setFlightMessage("");

    try {
      const query = searchParams.toString();
      const res = await fetch(`/api/search${query ? `?${query}` : ""}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load flights");
      }

      if (!Array.isArray(data)) {
        throw new Error("Schedules API did not return a flight list");
      }

      setFlights(data);
      if (data.length === 0) {
        setFlightMessageTone("info");
        setFlightMessage("No scheduled flights match this route and date range.");
      } else {
        setFlightMessageTone("success");
        setFlightMessage(`${data.length} scheduled ${data.length === 1 ? "flight" : "flights"} found.`);
      }
    } catch (error: unknown) {
      setFlights([]);
      setFlightMessageTone("error");
      setFlightMessage(getErrorMessage(error));
    } finally {
      setLoadingFlights(false);
    }
  }

  async function loadBookings(nameOverride?: string, emailOverride?: string) {
    const trimmedName = (nameOverride ?? passengerName).trim();
    const trimmedEmail = (emailOverride ?? passengerEmail).trim();

    if (!trimmedName && !trimmedEmail) {
      setBookingMessageTone("error");
      setBookingMessage("Enter a passenger name or email to retrieve bookings.");
      return;
    }

    if (trimmedName && trimmedName.length < 2) {
      setBookingMessageTone("error");
      setBookingMessage("Passenger name must contain at least two characters.");
      return;
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      setBookingMessageTone("error");
      setBookingMessage("Enter a valid email address, for example alex@example.com.");
      return;
    }

    setLoadingBookings(true);
    setBookingMessage("");

    try {
      const params = new URLSearchParams();

      if (trimmedName) {
        params.set("passengerName", trimmedName);
      }

      if (trimmedEmail) {
        params.set("passengerEmail", trimmedEmail);
      }

      const res = await fetch(`/api/bookings?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load bookings");
      }

      if (!Array.isArray(data)) {
        throw new Error("Bookings API did not return a booking list");
      }

      setBookings(data);
      if (data.length === 0) {
        setBookingMessageTone("info");
        setBookingMessage("No confirmed bookings were found for this passenger.");
      } else {
        setBookingMessageTone("success");
        setBookingMessage(`${data.length} confirmed ${data.length === 1 ? "booking" : "bookings"} found.`);
      }
    } catch (error: unknown) {
      setBookings([]);
      setBookingMessageTone("error");
      setBookingMessage(getErrorMessage(error));
    } finally {
      setLoadingBookings(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFlights();
    }, 0);

    return () => window.clearTimeout(timer);
    // Initial schedule search only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (origin && destination && origin === destination) {
      setFlights([]);
      setSelectedFlight(null);
      setFlightMessageTone("error");
      setFlightMessage("Departure and destination cannot be the same airport.");
      return;
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      setFlights([]);
      setSelectedFlight(null);
      setFlightMessageTone("error");
      setFlightMessage("The start date must be before or the same as the end date.");
      return;
    }

    await loadFlights(getCurrentSearchParams());
  }

  async function handleBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFlight) {
      setReservationMessageTone("error");
      setReservationMessage("Please select a scheduled flight first.");
      return;
    }

    const trimmedBookingName = bookingName.trim();
    const trimmedBookingEmail = bookingEmail.trim();

    if (!trimmedBookingName) {
      setReservationMessageTone("error");
      setReservationMessage("Passenger name is required before confirming a booking.");
      return;
    }

    if (trimmedBookingName.length < 2) {
      setReservationMessageTone("error");
      setReservationMessage("Passenger name must contain at least two characters.");
      return;
    }

    if (trimmedBookingEmail && !isValidEmail(trimmedBookingEmail)) {
      setReservationMessageTone("error");
      setReservationMessage("Enter a valid passenger email address, for example alex@example.com.");
      return;
    }

    if (!bookingGender) {
      setReservationMessageTone("error");
      setReservationMessage("Select the passenger gender before confirming the booking.");
      return;
    }

    for (let i = 0; i < companions.length; i++) {
      if (!companions[i].name.trim()) {
        setReservationMessageTone("error");
        setReservationMessage(`Companion ${i + 1} name is required.`);
        return;
      }
      if (!companions[i].gender) {
        setReservationMessageTone("error");
        setReservationMessage(`Companion ${i + 1} gender is required.`);
        return;
      }
    }

    if (seats < 1 || seats > selectedFlight.availableSeats) {
      setReservationMessageTone("error");
      setReservationMessage(`Choose between 1 and ${selectedFlight.availableSeats} available seats.`);
      return;
    }

    setReservationMessage("");
    setLastReference("");

    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passengerName: trimmedBookingName,
          passengerEmail: trimmedBookingEmail,
          passengerGender: bookingGender,
          flightId: selectedFlight._id,
          seats,
          companions: companions.map(c => ({ name: c.name.trim(), gender: c.gender }))
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Booking failed");
      }

      setLastReference(data.bookingReference);
      
      // 创建成功订单的完整对象用于弹窗展示
      const newBooking: Booking = {
        bookingReference: data.bookingReference,
        passengerName: trimmedBookingName,
        passengerEmail: trimmedBookingEmail,
        passengerGender: bookingGender,
        seats: seats,
        schedule: selectedFlight,
        companions: [...companions]
      };
      setConfirmedBooking(newBooking);

      setReservationMessageTone("success");
      setReservationMessage("Booking confirmed. Save the reference below for managing this trip.");
      setPassengerName(trimmedBookingName);
      setPassengerEmail(trimmedBookingEmail);
      await loadFlights(getCurrentSearchParams());
      await loadBookings(trimmedBookingName, trimmedBookingEmail);
    } catch (error: unknown) {
      setReservationMessageTone("error");
      setReservationMessage(getErrorMessage(error));
    }
  }

  async function handleCancelRequest(bookingOrRef: Booking | string) {
    if (typeof bookingOrRef === "string") {
      // 如果是通过参考号手动取消，先尝试在列表中查找完整信息
      const reference = bookingOrRef.trim().toUpperCase();
      const found = bookings.find(b => b.bookingReference === reference);
      if (found) {
        setBookingToCancel(found);
      } else {
        // 如果在当前列表中没找到，创建一个基础信息对象来触发统一的确认弹窗
        const placeholderBooking: Booking = {
          bookingReference: reference,
          passengerName: "Manual Retrieval",
          schedule: {
            flightNumber: "Unknown",
            // ... (其他 Flight 占位符属性)
            originCode: "N/A",
            destinationCode: "N/A",
            departureLocalTime: "N/A",
            departureLocalDate: firstSeedDate,
            originTimeZone: "+0000",
          } as Flight,
        };
        placeholderBooking.companions = []; // 确保即使是占位符 Booking 也有 companions 数组
        setBookingToCancel(placeholderBooking);
      }
    } else {
      setBookingToCancel(bookingOrRef);
    }
  }

  async function executeCancellation(reference: string) {
    const trimmedReference = reference.trim().toUpperCase();

    if (!trimmedReference) {
      setCancelMessageTone("error");
      setCancelMessage("Enter a booking reference to cancel.");
      return;
    }

    if (!/^DFJ-[A-Z0-9]+-[A-Z0-9]+$/i.test(trimmedReference)) {
      setCancelMessageTone("error");
      setCancelMessage("Booking references look like DFJ-XXXXXXXX-XXXX.");
      return;
    }

    setCancelMessage("");

    try {
      const params = new URLSearchParams({ bookingReference: trimmedReference });
      const res = await fetch(`/api/bookings?${params.toString()}`, {
        method: "DELETE"
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Cancellation failed");
      }

      setCancelReference("");
      setCancelMessageTone("success");
      setCancelMessage(`Booking ${data.bookingReference} has been cancelled.`);
      
      // 立即从本地状态中删除（不区分大小写），确保 UI 实时更新且不会被旧数据覆盖
      setBookings((prev) => prev.filter((b) => b.bookingReference.toUpperCase() !== trimmedReference));

      await loadFlights(getCurrentSearchParams());
    } catch (error: unknown) {
      setCancelMessageTone("error");
      setCancelMessage(getErrorMessage(error));
    }
  }

  return (
    <main className="min-h-screen w-full bg-[#f3f0ea] text-[#111827]">
      <header className="sticky top-0 z-50 border-b border-[#32536a] bg-[#0d2335]/95 text-white backdrop-blur shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-2xl font-bold tracking-tight text-white">Dairy Flat <span className="text-[#d6a75c]">Airways</span></p>
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#b8d8d2] opacity-90">Private regional network</p>
          </div>
          <nav className="hidden items-center gap-2 md:flex">
            <a href="#search" className="px-4 py-2 text-lg font-bold tracking-wider text-white hover:bg-[#1e625d] rounded-md transition-all">SEARCH</a>
            <a href="#book" className="px-4 py-2 text-lg font-bold tracking-wider text-white hover:bg-[#1e625d] rounded-md transition-all">BOOK</a>
            <a href="#manage" className="ml-2 px-5 py-2 text-lg font-bold tracking-wider bg-[#d6a75c] text-[#0d2335] rounded-md hover:bg-[#f2c977] transition-all shadow-md">MANAGE TRAVEL</a>
          </nav>
        </div>
      </header>

      <section className="bg-[#0d2335] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div className="pb-3">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b8d8d2]">
              Dairy Flat based charter and scheduled services
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
              Fly the New Zealand network with a private-aircraft standard.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#d6e0e3]">
              Search flights, reserve seats instantly, and manage existing bookings by
              passenger details or booking reference.
            </p>
            <div className="mt-6 grid max-w-2xl grid-cols-3 gap-3">
              <div className="border-l border-[#5e7c82] pl-3">
                <p className="text-2xl font-semibold">5</p>
                <p className="text-xs uppercase tracking-[0.16em] text-[#b8d8d2]">Aircraft</p>
              </div>
              <div className="border-l border-[#5e7c82] pl-3">
                <p className="text-2xl font-semibold">6</p>
                <p className="text-xs uppercase tracking-[0.16em] text-[#b8d8d2]">Airports</p>
              </div>
              <div className="border-l border-[#5e7c82] pl-3">
                <p className="text-2xl font-semibold">8w</p>
                <p className="text-xs uppercase tracking-[0.16em] text-[#b8d8d2]">Loaded schedule</p>
              </div>
            </div>
          </div>

          <div className="relative min-h-72 overflow-hidden rounded-lg border border-[#32536a] bg-[#17344a]">
            <Image
              src="/globe.svg"
              alt=""
              width={210}
              height={210}
              priority
              className="absolute right-7 top-7 opacity-25 invert"
            />
            <div className="absolute inset-x-8 top-10 h-px rotate-6 bg-[#83c5be]" />
            <div className="absolute inset-x-16 top-32 h-px -rotate-12 bg-[#d6a75c]" />
            <div className="absolute bottom-20 left-10 right-20 h-px rotate-3 bg-[#f4f1ea]" />
            <div className="absolute left-8 top-8 h-3 w-3 rounded-full bg-[#83c5be]" />
            <div className="absolute left-[38%] top-[44%] h-3 w-3 rounded-full bg-[#d6a75c]" />
            <div className="absolute bottom-16 right-16 h-3 w-3 rounded-full bg-[#f4f1ea]" />
            <div className="absolute bottom-6 left-6 right-6 rounded-md bg-[#0d2335]/80 p-4 backdrop-blur">
              <p className="text-sm uppercase tracking-[0.18em] text-[#b8d8d2]">Featured route</p>
              <p className="mt-1 text-xl font-semibold">Dairy Flat to Sydney Prestige</p>
              <p className="mt-1 text-sm text-[#d6e0e3]">
                SyberJet SJ30i, six-seat luxury cabin, Friday outbound and Sunday return.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-7">
        {/* TOP: Search a flight - Full Width */}
        <section id="search" className="scroll-mt-20">
          <form onSubmit={handleSearch} className="rounded-lg border border-[#d8d1c4] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ebe5db] pb-4">
              <div>
                <h2 className="text-2xl font-semibold">Search a flight</h2>
                <p className="mt-1 text-sm text-[#5e6878]">
                  Choose airports and a date range. Leave either airport as Any to view all matching services.
                </p>
              </div>
              <p className="rounded-md bg-[#edf6f4] px-3 py-2 text-sm font-medium text-[#1e625d]">
                {resultsSummary}
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm font-medium text-[#374151]">
                From
                <select
                  value={origin}
                  onChange={(event) => setOrigin(event.target.value)}
                  className="mt-2 w-full rounded-md border border-[#c8c0b2] bg-white px-3 py-2 outline-none focus:border-[#1e625d]"
                >
                  {airportOptions.map((option) => (
                    <option key={`origin-${option.value || "any"}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-[#374151]">
                To
                <select
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  className="mt-2 w-full rounded-md border border-[#c8c0b2] bg-white px-3 py-2 outline-none focus:border-[#1e625d]"
                >
                  {airportOptions.map((option) => (
                    <option key={`destination-${option.value || "any"}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-[#374151]">
                Depart from
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="mt-2 w-full rounded-md border border-[#c8c0b2] px-3 py-2 outline-none focus:border-[#1e625d]"
                />
              </label>

              <label className="text-sm font-medium text-[#374151]">
                Depart until
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="mt-2 w-full rounded-md border border-[#c8c0b2] px-3 py-2 outline-none focus:border-[#1e625d]"
                />
              </label>

            </div>

            <div className="mt-4 flex flex-col gap-2 border-t border-[#ebe5db] pt-4 sm:flex-row sm:justify-end">
              <button
                type="submit"
                className="min-h-10 rounded-md bg-[#1e625d] px-6 py-2 font-semibold text-white hover:bg-[#174f4b] sm:min-w-36"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrigin("NZNE");
                  setDestination("");
                  setDateFrom(firstSeedDate);
                  setDateTo(defaultEndDate);
                  void loadFlights(
                    new URLSearchParams({ origin: "NZNE", dateFrom: firstSeedDate, dateTo: defaultEndDate })
                  );
                }}
                className="min-h-10 rounded-md border border-[#c8c0b2] px-6 py-2 font-semibold text-[#374151] hover:bg-[#f7f4ee] sm:min-w-32"
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        {/* MIDDLE: Results and Booking Form side-by-side */}
        <div id="book" className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr] scroll-mt-20">
          {/* Scheduled flights (Results) */}
          <div className="rounded-lg border border-[#d8d1c4] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebe5db] px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold">Scheduled flights</h2>
                <p className="mt-1 text-sm text-[#5e6878]">Times are shown in each airport&apos;s local timezone.</p>
              </div>
            </div>

            {flightMessage && (
              <p className={`border-b px-5 py-3 text-sm ${messageClass(flightMessageTone)}`}>
                {flightMessage}
              </p>
            )}

            <div className="max-h-[760px] overflow-y-auto divide-y divide-[#ebe5db]">
              {loadingFlights ? (
                <p className="px-5 py-6 text-[#5e6878]">Loading flights...</p>
              ) : (
                flights.map((flight) => (
                  <article key={flight._id} className="grid gap-5 px-5 py-5 lg:grid-cols-[1fr_auto]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="rounded-md bg-[#edf6f4] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#1e625d]">
                          {flight.flightNumber}
                        </p>
                        <p className="text-sm font-medium text-[#5e6878]">{flight.service}</p>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                        <div>
                          <p className="text-3xl font-semibold">{flight.originCode}</p>
                          <p className="mt-1 text-sm text-[#5e6878]">{flight.origin}</p>
                          <p className="mt-2 text-sm font-medium">{flightTime(flight)}</p>
                        </div>
                        <div className="hidden min-w-28 text-center md:block">
                          <p className="text-xs uppercase tracking-[0.18em] text-[#7b8493]">
                            {duration(flight.durationMinutes)}
                          </p>
                          <div className="mt-2 h-px bg-[#c8c0b2]" />
                        </div>
                        <div className="md:text-right">
                          <p className="text-3xl font-semibold">{flight.destinationCode}</p>
                          <p className="mt-1 text-sm text-[#5e6878]">{flight.destination}</p>
                          <p className="mt-2 text-sm font-medium">{flightArrival(flight)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-sm text-[#5e6878]">
                        <span className="rounded-md bg-[#f4f1ea] px-2.5 py-1">{flight.aircraft.model}</span>
                        <span className="rounded-md bg-[#f4f1ea] px-2.5 py-1">{flight.aircraft.cabin}</span>
                        <span className="rounded-md bg-[#f4f1ea] px-2.5 py-1">{money(flight.priceNzd)} per seat</span>
                      </div>
                    </div>

                    <div className="flex min-w-44 flex-col items-start justify-between gap-3 rounded-md border border-[#ebe5db] bg-[#faf8f3] p-4 lg:items-end">
                      <div className="lg:text-right">
                        <p className="text-sm text-[#5e6878]">Availability</p>
                        <p className="mt-1 text-xl font-semibold">
                          {flight.availableSeats} of {flight.capacity}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={flight.availableSeats === 0}
                        onClick={() => {
                          setSelectedFlight(flight);
                          updateSeats(1);
                          setLastReference("");
                        }}
                        className="w-full rounded-md bg-[#0d2335] px-4 py-2 text-sm font-semibold text-white hover:bg-[#17344a] disabled:cursor-not-allowed disabled:bg-[#9aa1ad]"
                      >
                        {flight.availableSeats === 0 ? "Full" : "Select flight"}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          {/* Confirm seats (Booking) */}
          <form
            onSubmit={handleBooking}
            className="rounded-lg border border-[#d8d1c4] bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1e625d]">Reservation</p>
            <h2 className="mt-2 text-2xl font-semibold">Confirm seats</h2>
            <div className="mt-4 rounded-md border border-[#ebe5db] bg-[#faf8f3] p-4">
              <p className="font-semibold">{selectedFlightLabel}</p>
              {selectedFlight && (
                <p className="mt-1 text-sm text-[#5e6878]">
                  {flightTime(selectedFlight)} to {selectedFlight.destinationCode}, {money(selectedFlight.priceNzd)}
                  /seat
                </p>
              )}
            </div>

            <label className="mt-4 block text-sm font-medium text-[#374151]">
              Passenger name
              <input
                value={bookingName}
                onChange={(event) => setBookingName(event.target.value)}
                className="mt-2 w-full rounded-md border border-[#c8c0b2] px-3 py-2 outline-none focus:border-[#1e625d]"
                placeholder="Alex Chen"
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-[#374151]">
              Email
              <input
                type="email"
                value={bookingEmail}
                onChange={(event) => setBookingEmail(event.target.value)}
                className="mt-2 w-full rounded-md border border-[#c8c0b2] px-3 py-2 outline-none focus:border-[#1e625d]"
                placeholder="alex@example.com"
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-[#374151]">
              Gender
              <select
                value={bookingGender}
                onChange={(event) => setBookingGender(event.target.value)}
                className="mt-2 w-full rounded-md border border-[#c8c0b2] bg-white px-3 py-2 outline-none focus:border-[#1e625d]"
              >
                {genderOptions.map((option) => (
                  <option key={option.value || "empty-gender"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-sm font-medium text-[#374151]">
              Seats
              <input
                type="number"
                min={1}
                max={selectedFlight?.availableSeats || 6}
                value={seats}
                onChange={(event) => updateSeats(Number(event.target.value))}
                className="mt-2 w-full rounded-md border border-[#c8c0b2] px-3 py-2 outline-none focus:border-[#1e625d]"
              />
            </label>

            {companions.map((comp, index) => (
              <div key={`companion-${index}`} className="mt-6 border-t border-[#ebe5db] pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#1e625d]">Companion {index + 1}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="mt-2 block text-sm font-medium text-[#374151]">
                    Name
                    <input
                      value={comp.name}
                      onChange={(e) => {
                        const newComps = [...companions];
                        newComps[index].name = e.target.value;
                        setCompanions(newComps);
                      }}
                      className="mt-1 w-full rounded-md border border-[#c8c0b2] px-3 py-2 outline-none focus:border-[#1e625d]"
                      placeholder="Full name"
                    />
                  </label>
                  <label className="mt-2 block text-sm font-medium text-[#374151]">
                    Gender
                    <select
                      value={comp.gender}
                      onChange={(e) => {
                        const newComps = [...companions];
                        newComps[index].gender = e.target.value;
                        setCompanions(newComps);
                      }}
                      className="mt-1 w-full rounded-md border border-[#c8c0b2] bg-white px-3 py-2 outline-none focus:border-[#1e625d]"
                    >
                      {genderOptions.map((option) => (
                        <option key={`comp-${index}-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}

            <button
              type="submit"
              className="mt-5 w-full rounded-md bg-[#1e625d] px-4 py-2 font-semibold text-white hover:bg-[#174f4b]"
            >
              Confirm booking
            </button>

            {reservationMessage && (
              <p className={`mt-4 rounded-md border px-3 py-2 text-sm ${messageClass(reservationMessageTone)}`}>
                {reservationMessage}
              </p>
            )}

            {lastReference && (
              <div className="mt-4 rounded-md border border-[#b8d8d2] bg-[#edf6f4] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[#1e625d]">Booking reference</p>
                <p className="mt-1 font-mono text-lg font-semibold text-[#0d2335]">{lastReference}</p>
              </div>
            )}
          </form>
        </div>

        {/* BOTTOM: Manage travel - Grouped at the bottom */}
        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <section id="manage" className="scroll-mt-20 rounded-lg border border-[#d8d1c4] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1e625d]">Manage travel</p>
            <h2 className="mt-2 text-2xl font-semibold">Passenger bookings</h2>
            <p className="mt-2 text-sm text-[#5e6878]">
              Retrieve all confirmed flights for a passenger, then cancel any booking from the results.
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void loadBookings();
              }}
              className="mt-4 grid gap-3"
            >
              <input
                value={passengerName}
                onChange={(event) => setPassengerName(event.target.value)}
                className="rounded-md border border-[#c8c0b2] px-3 py-2 outline-none focus:border-[#1e625d]"
                placeholder="Passenger name"
              />
              <input
                type="email"
                value={passengerEmail}
                onChange={(event) => setPassengerEmail(event.target.value)}
                className="rounded-md border border-[#c8c0b2] px-3 py-2 outline-none focus:border-[#1e625d]"
                placeholder="Passenger email"
              />
              <button
                type="submit"
                className="rounded-md bg-[#0d2335] px-4 py-2 font-semibold text-white hover:bg-[#17344a]"
              >
                Find bookings
              </button>
            </form>

            {bookingMessage && (
              <p className={`mt-4 rounded-md border px-3 py-2 text-sm ${messageClass(bookingMessageTone)}`}>
                {bookingMessage}
              </p>
            )}

            <div className="mt-4 space-y-3">
              {loadingBookings ? (
                <p className="text-sm text-[#5e6878]">Loading bookings...</p>
              ) : (
                bookings.map((booking) => (
                  <article key={booking.bookingReference} className="rounded-md border border-[#ebe5db] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {booking.schedule.flightNumber} {booking.schedule.originCode} to{" "}
                          {booking.schedule.destinationCode}
                        </p>
                        <p className="mt-1 font-mono text-sm text-[#1e625d]">{booking.bookingReference}</p>
                      </div>
                      <p className="rounded-md bg-[#f4f1ea] px-2 py-1 text-xs font-semibold">
                        {seatsLabel(booking.seats || 1)}
                      </p>
                    </div>
                    <p className="mt-3 text-sm text-[#5e6878]">{flightTime(booking.schedule)}</p>
                    <p className="text-sm text-[#5e6878]">
                      Passenger: {booking.passengerName} - Gender: {genderLabel(booking.passengerGender)}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmedBooking(booking)}
                        className="rounded-md border border-[#c8c0b2] px-3 py-2 text-sm font-semibold text-[#374151] hover:bg-[#f3f0ea] transition-colors"
                      >
                        View details
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCancelRequest(booking)}
                        className="rounded-md border border-[#b84a4a] px-3 py-2 text-sm font-semibold text-[#9d3030] hover:bg-[#fff2f2]"
                      >
                        Cancel booking
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleCancelRequest(cancelReference);
            }}
            className="rounded-lg border border-[#d8d1c4] bg-white p-5 shadow-sm"
          >
            <h2 className="text-xl font-semibold">Cancel by reference</h2>
            <p className="mt-2 text-sm text-[#5e6878]">
              Use the reference issued after booking if passenger details are not available.
            </p>
            <input
              value={cancelReference}
              onChange={(event) => setCancelReference(event.target.value.toUpperCase())}
              className="mt-4 w-full rounded-md border border-[#c8c0b2] px-3 py-2 font-mono outline-none focus:border-[#1e625d]"
              placeholder="DFJ-..."
            />
            <button
              type="submit"
              className="mt-3 w-full rounded-md border border-[#b84a4a] px-4 py-2 font-semibold text-[#9d3030] hover:bg-[#fff2f2]"
            >
              Cancel booking
            </button>
            {cancelMessage && (
              <p className={`mt-3 rounded-md border px-3 py-2 text-sm ${messageClass(cancelMessageTone)}`}>
                {cancelMessage}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* 取消订单确认弹窗 (Cancel Confirmation Modal) */}
      {bookingToCancel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-[#d8d1c4] bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-[#fff1ec] px-6 py-4 border-b border-[#e7b8aa]">
              <h3 className="text-xl font-bold text-[#9d3030]">Confirm Cancellation</h3>
              <p className="text-sm text-[#9d3030]/80">Please review the booking details carefully.</p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#5e6878]">Reference</p>
                    <p className="font-mono text-lg font-bold text-[#1e625d]">{bookingToCancel.bookingReference}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#5e6878]">Passenger</p>
                    <p className="font-semibold">{bookingToCancel.passengerName}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-[#ebe5db] bg-[#faf8f3] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                        <p className="text-lg font-bold">{bookingToCancel.schedule?.originCode || 'N/A'} → {bookingToCancel.schedule?.destinationCode || 'N/A'}</p>
                        <p className="text-sm text-[#5e6878]">{bookingToCancel.schedule ? flightTime(bookingToCancel.schedule) : 'Time unknown'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#1e625d]">{seatsLabel(bookingToCancel.seats || 1)}</p>
                        <p className="text-xs text-[#5e6878]">{bookingToCancel.schedule?.flightNumber || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-[#5e6878] italic">
                  * Note: This action is permanent. Your seats will be immediately released back to the flight capacity.
                </p>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setBookingToCancel(null)}
                  className="flex-1 rounded-md border border-[#c8c0b2] py-2.5 font-semibold text-[#374151] hover:bg-[#f3f0ea] transition-colors"
                >
                  Keep Booking
                </button>
                <button
                  onClick={() => {
                    void executeCancellation(bookingToCancel.bookingReference);
                    setBookingToCancel(null);
                  }}
                  className="flex-1 rounded-md bg-[#9d3030] py-2.5 font-semibold text-white hover:bg-[#832828] transition-colors shadow-sm"
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 预定成功详情确认弹窗 (Booking Success Modal) */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#b8d8d2] bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="bg-[#1e625d] px-8 py-6 text-white text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold">Booking Confirmed!</h3>
              <p className="text-[#b8d8d2]">Your trip with Dairy Flat Airways is secured.</p>
            </div>

            <div className="p-8">
              <div className="grid gap-8 md:grid-cols-2">
                {/* Left Column: Flight & Reference */}
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#7b8493]">Booking Reference</p>
                    <p className="mt-1 font-mono text-2xl font-extrabold text-[#1e625d]">{confirmedBooking.bookingReference}</p>
                  </div>

                  <div className="rounded-xl border border-[#ebe5db] bg-[#faf8f3] p-4">
                    <div className="flex items-center justify-between border-b border-[#ebe5db] pb-3 mb-3">
                      <span className="text-sm font-bold text-[#1e625d]">{confirmedBooking.schedule.flightNumber}</span>
                      <span className="text-xs text-[#5e6878]">{confirmedBooking.schedule.aircraft.model}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xl font-bold">{confirmedBooking.schedule.originCode}</p>
                        <p className="text-xs text-[#5e6878]">{confirmedBooking.schedule.departureLocalTime}</p>
                      </div>
                      <div className="px-4 text-[#c8c0b2]">✈</div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{confirmedBooking.schedule.destinationCode}</p>
                        <p className="text-xs text-[#5e6878]">{confirmedBooking.schedule.arrivalLocalTime}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-center text-xs font-medium text-[#5e6878]">
                      {formatDate(confirmedBooking.schedule.departureLocalDate)}
                    </p>
                  </div>
                </div>

                {/* Right Column: Passenger & Price */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-[#7b8493]">Passengers</p>
                      <p className="font-semibold">{confirmedBooking.passengerName} (Primary)</p>
                      {confirmedBooking.companions?.map((c, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[#374151]">{c.name}</p>
                          <span className="text-[10px] uppercase px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{genderLabel(c.gender)}</span>
                        </div>
                      ))}
                      <p className="mt-1 text-xs text-[#5e6878] italic">{confirmedBooking.passengerEmail || 'No email provided'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-[#7b8493]">Seats</p>
                      <p className="font-semibold">{seatsLabel(confirmedBooking.seats || 1)}</p>
                    </div>
                  </div>

                  <div className="border-t border-[#ebe5db] pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#5e6878]">Fare ({confirmedBooking.seats}x)</span>
                      <span>{money(confirmedBooking.schedule.priceNzd * (confirmedBooking.seats || 1))}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-sm">
                      <span className="text-[#5e6878]">Taxes & Fees</span>
                      <span className="text-green-600 font-medium">Included</span>
                    </div>
                    <div className="mt-3 flex justify-between border-t border-[#ebe5db] pt-3">
                      <span className="font-bold">Total Amount</span>
                      <span className="text-xl font-extrabold text-[#0d2335]">
                        {money(confirmedBooking.schedule.priceNzd * (confirmedBooking.seats || 1))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => window.print()}
                  className="flex-1 rounded-lg border border-[#c8c0b2] py-3 font-bold text-[#374151] hover:bg-[#f3f0ea] transition-colors"
                >
                  Print Receipt
                </button>
                <button
                  onClick={() => setConfirmedBooking(null)}
                  className="flex-1 rounded-lg bg-[#d6a75c] py-3 font-bold text-[#0d2335] hover:bg-[#f2c977] transition-all shadow-md"
                >
                  Close & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
