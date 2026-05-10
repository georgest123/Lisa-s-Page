import type { Booking, Service, Treatment } from "@/lib/supabase/types";

export type ServiceWithTreatments = Service & { treatments: Treatment[] };

/** Minutes from midnight for "HH:mm" or "HH:mm:ss". */
export function minutesFromTimeString(time: string): number {
  const parts = time.split(":");
  const hours = Number(parts[0]);
  const mins = Number(parts[1]);
  return hours * 60 + mins;
}

export function durationMinutesForBookingRow(
  booking: Pick<Booking, "service_id" | "treatment_id">,
  services: ServiceWithTreatments[],
): number {
  const service = services.find((s) => s.id === booking.service_id);
  const treatment = service?.treatments.find((t) => t.id === booking.treatment_id);
  if (treatment?.duration_minutes != null && treatment.duration_minutes > 0) {
    return treatment.duration_minutes;
  }
  if (service != null && service.duration_minutes > 0) {
    return service.duration_minutes;
  }
  return 45;
}

/** Wall-clock span blocked for other clients: service time + trailing buffer. */
export function bookingOccupiedRange(
  booking: Booking,
  services: ServiceWithTreatments[],
  bufferMinutes: number,
): { start: number; end: number } {
  const start = minutesFromTimeString(booking.requested_time);
  const duration = durationMinutesForBookingRow(booking, services);
  return {
    start,
    end: start + duration + bufferMinutes,
  };
}

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** True if this start time would overlap any existing booking on that date. */
export function newBookingOverlapsExisting(
  requestedDate: string,
  startTimeStr: string,
  durationMinutes: number,
  bufferMinutes: number,
  existingBookings: Booking[],
  services: ServiceWithTreatments[],
): boolean {
  const start = minutesFromTimeString(startTimeStr);
  const candEnd = start + durationMinutes + bufferMinutes;

  for (const booking of existingBookings) {
    if (booking.requested_date !== requestedDate) continue;
    if (booking.status === "cancelled") continue;

    const occ = bookingOccupiedRange(booking, services, bufferMinutes);
    if (rangesOverlap(start, candEnd, occ.start, occ.end)) {
      return true;
    }
  }

  return false;
}
