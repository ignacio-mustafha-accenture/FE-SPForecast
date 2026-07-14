'use client';

import { useState, useRef, useEffect } from 'react';
import { DayPicker, useDayPicker } from 'react-day-picker';
import type { CalendarMonth, DayButtonProps } from 'react-day-picker';
import { format, parse, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/src/lib/cn';

const ISO = 'yyyy-MM-dd';

function CalendarHeader({ calendarMonth }: { calendarMonth: CalendarMonth }) {
  const { goToMonth, nextMonth, previousMonth } = useDayPicker();
  return (
    <div className="flex items-center justify-between mb-1">
      <button
        type="button"
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        className="p-1 rounded hover:bg-[var(--G6)] text-[var(--G2)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={14} strokeWidth={2} />
      </button>
      <span className="text-sm font-semibold text-[var(--G1)] capitalize">
        {format(calendarMonth.date, 'LLLL yyyy', { locale: es })}
      </span>
      <button
        type="button"
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        className="p-1 rounded hover:bg-[var(--G6)] text-[var(--G2)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

function CalendarDayButton({ modifiers, ...props }: DayButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'w-8 h-8 rounded-md text-sm flex items-center justify-center transition-colors focus:outline-none',
        modifiers.selected
          ? 'bg-[var(--P)] text-white hover:bg-[var(--PD)]'
          : cn(
              'text-[var(--G1)] hover:bg-[var(--G6)]',
              modifiers.today && 'font-bold text-[var(--P)]',
            ),
        (modifiers.outside || modifiers.disabled) && 'opacity-40',
        modifiers.disabled && 'cursor-not-allowed',
      )}
    />
  );
}

interface DatePickerProps {
  label?: string;
  value?: string;
  onChange?: (val: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function DatePicker({
  label,
  value,
  onChange,
  error,
  placeholder = 'dd/mm/aaaa',
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = value ? parse(value, ISO, new Date()) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;
  const display = selected ? format(selected, 'd MMM yyyy', { locale: es }) : '';

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function handleOpen() {
    if (disabled) return;
    if (!value) onChange?.(format(new Date(), ISO));
    setOpen((v) => !v);
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-[var(--G1)]">{label}</label>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={handleOpen}
          className={cn(
            'h-9 w-full rounded border border-[var(--G5)] bg-white px-3 text-sm text-left flex items-center gap-2',
            'transition-colors focus:outline-none focus:border-[var(--P)] focus:ring-1 focus:ring-[var(--P)]',
            'disabled:bg-[var(--G6)] disabled:cursor-not-allowed',
            error && 'border-[var(--RD)] focus:border-[var(--RD)] focus:ring-[var(--RD)]',
            open && 'border-[var(--P)] ring-1 ring-[var(--P)]',
          )}
        >
          <span className={cn('flex-1', display ? 'text-[var(--G1)]' : 'text-[var(--G4)]')}>
            {display || placeholder}
          </span>
          <Calendar size={14} className="text-[var(--G3)] shrink-0" />
        </button>

        {open && (
          <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-[var(--G5)] rounded-lg shadow-lg p-3 select-none">
            <DayPicker
              mode="single"
              selected={selected ?? new Date()}
              defaultMonth={selected ?? new Date()}
              onSelect={(date) => {
                if (date) {
                  onChange?.(format(date, ISO));
                  setOpen(false);
                }
              }}
              locale={es}
              components={{
                MonthCaption: CalendarHeader,
                Nav: () => null,
                DayButton: CalendarDayButton,
              }}
              classNames={{
                root: 'text-sm w-[252px]',
                months: 'flex',
                month: 'space-y-1',
                month_caption: '',
                month_grid: 'w-full border-collapse',
                weekdays: '',
                weekday: 'text-xs font-medium text-[var(--G4)] w-8 h-7 text-center',
                week: '',
                day: 'p-0',
              }}
            />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-[var(--RD)]">{error}</p>}
    </div>
  );
}
