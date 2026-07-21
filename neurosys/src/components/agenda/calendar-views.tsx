"use client";

import { Clock3, MapPin } from "lucide-react";
import {
  addDays,
  CALENDAR_END_HOUR,
  CALENDAR_START_HOUR,
  ecuadorDateKey,
  formatTime,
  statusLabels,
  statusStyles,
  WEEKDAYS_SHORT,
} from "@/lib/agenda/calendar";
import type { CalendarAppointment } from "@/lib/agenda/types";

type CommonProps = {
  appointments: CalendarAppointment[];
  today: string;
  onAppointment: (appointment: CalendarAppointment) => void;
  onSlot: (date: string, time?: string) => void;
};

export function WeekView({
  weekStart,
  appointments,
  today,
  onAppointment,
  onSlot,
}: CommonProps & { weekStart: string }) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const hours = Array.from(
    { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR },
    (_, index) => `${String(CALENDAR_START_HOUR + index).padStart(2, "0")}:00`,
  );

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1080px]">
        <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-slate-100">
          <div className="border-r border-slate-100 p-3" />
          {days.map((day, index) => (
            <div
              className={`border-r border-slate-100 p-3 text-center last:border-r-0 ${
                day === today ? "bg-indigo-50/50" : ""
              }`}
              key={day}
            >
              <p
                className={`text-[9px] font-bold ${
                  day === today ? "text-indigo-600" : "text-slate-400"
                }`}
              >
                {WEEKDAYS_SHORT[index]}
              </p>
              <span
                className={`mx-auto mt-1 grid size-7 place-items-center rounded-full text-xs font-bold ${
                  day === today ? "bg-indigo-600 text-white" : "text-slate-700"
                }`}
              >
                {Number(day.slice(-2))}
              </span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[64px_repeat(7,1fr)]">
          <div className="border-r border-slate-100">
            {hours.map((hour) => (
              <div
                className="h-20 border-b border-slate-100 pr-3 pt-2 text-right text-[9px] font-medium text-slate-400"
                key={hour}
              >
                {hour}
              </div>
            ))}
          </div>
          {days.map((day) => (
            <div
              className={`relative border-r border-slate-100 last:border-r-0 ${
                day === today ? "bg-indigo-50/20" : ""
              }`}
              key={day}
              style={{ height: `${hours.length * 80}px` }}
            >
              {hours.map((hour) => (
                <button
                  aria-label={`Agendar el ${day} a las ${hour}`}
                  className="block h-20 w-full border-b border-slate-100 hover:bg-indigo-50/50"
                  key={hour}
                  onClick={() => onSlot(day, hour)}
                />
              ))}
              {appointments
                .filter(
                  (appointment) =>
                    ecuadorDateKey(new Date(appointment.startsAt)) === day,
                )
                .map((appointment) => {
                  const start = new Date(appointment.startsAt);
                  const end = new Date(appointment.endsAt);
                  const [hour, minute] = formatTime(start).split(":").map(Number);
                  const top =
                    ((hour * 60 + minute - CALENDAR_START_HOUR * 60) / 60) * 80;
                  const height = Math.max(
                    36,
                    ((end.getTime() - start.getTime()) / 3_600_000) * 80 - 4,
                  );
                  if (top < 0 || top >= hours.length * 80) return null;
                  return (
                    <button
                      className={`absolute left-1.5 right-1.5 z-10 overflow-hidden rounded-lg border-l-[3px] p-2 text-left shadow-sm ${statusStyles[appointment.status]}`}
                      key={appointment.id}
                      onClick={() => onAppointment(appointment)}
                      style={{
                        top: `${top}px`,
                        height: `${Math.min(height, hours.length * 80 - top)}px`,
                      }}
                    >
                      <p className="truncate text-[10px] font-bold">
                        {appointment.patient}
                      </p>
                      <p className="mt-1 truncate text-[9px] opacity-75">
                        {formatTime(start)} · {appointment.service}
                      </p>
                      {height >= 70 && (
                        <p className="mt-1 flex items-center gap-1 truncate text-[8px] opacity-60">
                          <Clock3 size={9} /> {statusLabels[appointment.status]}
                        </p>
                      )}
                      {height >= 90 && (
                        <p className="mt-1 flex items-center gap-1 truncate text-[8px] opacity-60">
                          <MapPin size={9} /> {appointment.room}
                        </p>
                      )}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MonthView({
  days,
  monthKey,
  appointments,
  today,
  onAppointment,
  onSlot,
}: CommonProps & { days: string[]; monthKey: string }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60">
          {WEEKDAYS_SHORT.map((weekday) => (
            <div
              className="border-r border-slate-100 px-3 py-2.5 text-center text-[9px] font-bold text-slate-400 last:border-r-0"
              key={weekday}
            >
              {weekday}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayAppointments = appointments.filter(
              (appointment) =>
                ecuadorDateKey(new Date(appointment.startsAt)) === day,
            );
            const outsideMonth = day.slice(0, 7) !== monthKey;
            return (
              <div
                className={`min-h-32 border-b border-r border-slate-100 p-2 last:border-r-0 ${
                  outsideMonth ? "bg-slate-50/60" : "bg-white"
                } ${day === today ? "ring-1 ring-inset ring-indigo-200" : ""}`}
                key={day}
              >
                <button
                  aria-label={`Agendar el ${day}`}
                  className={`mb-2 grid size-7 place-items-center rounded-full text-[10px] font-bold ${
                    day === today
                      ? "bg-indigo-600 text-white"
                      : outsideMonth
                        ? "text-slate-300"
                        : "text-slate-600 hover:bg-indigo-50"
                  }`}
                  onClick={() => onSlot(day)}
                >
                  {Number(day.slice(-2))}
                </button>
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map((appointment) => (
                    <button
                      className={`block w-full truncate rounded-md border-l-2 px-1.5 py-1 text-left text-[8px] font-semibold ${statusStyles[appointment.status]}`}
                      key={appointment.id}
                      onClick={() => onAppointment(appointment)}
                      title={`${formatTime(appointment.startsAt)} · ${appointment.patient}`}
                    >
                      {formatTime(appointment.startsAt)} {appointment.patient}
                    </button>
                  ))}
                  {dayAppointments.length > 3 && (
                    <p className="px-1 text-[8px] font-bold text-indigo-600">
                      +{dayAppointments.length - 3} más
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
