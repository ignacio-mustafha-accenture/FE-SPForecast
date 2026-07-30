'use client';

import { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { useTranslations } from 'next-intl';
import { DayPicker } from 'react-day-picker';
import type { CalendarMonth, DayButtonProps } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Card, CardBody, CardHeader } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { useToast } from '@/src/hooks/useToast';
import { cn } from '@/src/lib/cn';

interface Holiday {
  id: number;
  country: string;
  date: string;
  name: string;
}

const COUNTRIES = ['AR', 'MX', 'CR'] as const;
type Country = (typeof COUNTRIES)[number];

const HolidayCtx = createContext<Map<string, string>>(new Map());

function HolidayMonthCaption({ calendarMonth }: { calendarMonth: CalendarMonth }) {
  return (
    <div className="flex items-center justify-center py-1">
      <span className="text-xs font-semibold text-[var(--G2)] capitalize">
        {format(calendarMonth.date, 'LLL', { locale: es })}
      </span>
    </div>
  );
}

function HolidayDayButton({ modifiers, day, ...props }: DayButtonProps) {
  const holidayMap = useContext(HolidayCtx);
  const dateStr = format(day.date, 'yyyy-MM-dd');
  const holidayName = holidayMap.get(dateStr);
  return (
    <button
      {...props}
      title={holidayName}
      className={cn(
        'w-7 h-7 rounded-full text-xs flex items-center justify-center transition-colors focus:outline-none',
        modifiers.holiday
          ? 'bg-[var(--P)] text-white'
          : cn(
              'text-[var(--G1)] hover:bg-[var(--G6)]',
              modifiers.today && 'font-bold text-[var(--P)]',
              modifiers.selected && 'ring-1 ring-[var(--P)]',
            ),
        modifiers.outside && 'opacity-30',
      )}
    />
  );
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 4 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: 'easeOut' as const, delay: Math.min(i * 0.04, 0.2) },
  }),
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

export function HolidaysView() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const toast = useToast();

  const [country, setCountry] = useState<Country>('AR');
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const currentYear = new Date().getFullYear();

  const holidayDates = useMemo(
    () => holidays.map(({ date }) => {
      const [y, m, d] = date.split('-').map(Number);
      return new Date(y, m - 1, d);
    }),
    [holidays],
  );
  const holidayMap = useMemo(() => new Map(holidays.map((h) => [h.date, h.name])), [holidays]);

  useEffect(() => {
    fetchHolidays();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  async function fetchHolidays() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/holidays?country=${country}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setHolidays(data.holidays ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!selectedDate || !newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/admin/holidays', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country,
          date: format(selectedDate, 'yyyy-MM-dd'),
          name: newName.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t('holidayAdded'));
      setNewName('');
      setSelectedDate(undefined);
      await fetchHolidays();
    } catch {
      toast.error(t('holidayAddError'));
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/admin/holidays/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      toast.success(t('holidayDeleted'));
      await fetchHolidays();
    } catch {
      toast.error(t('holidayDeleteError'));
    }
  }

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="show">

      {/* Country tabs */}
      <motion.div variants={cardVariants} className="flex border-b border-[var(--G5)]">
        {COUNTRIES.map((c) => (
          <button
            key={c}
            onClick={() => { setCountry(c); setSelectedDate(undefined); setNewName(''); }}
            className={cn(
              'px-5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              country === c
                ? 'border-[var(--P)] text-[var(--P)]'
                : 'border-transparent text-[var(--G3)] hover:text-[var(--G1)] hover:border-[var(--G4)]',
            )}
          >
            {c}
          </button>
        ))}
      </motion.div>

      {/* Calendar + list card */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-[var(--G1)]">{t('holidaysTitle')}</h2>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-36 rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* 12-month calendar grid */}
                <HolidayCtx.Provider value={holidayMap}>
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    numberOfMonths={12}
                    defaultMonth={new Date(currentYear, 0)}
                    disableNavigation
                    modifiers={{ holiday: holidayDates }}
                    locale={es}
                    components={{
                      MonthCaption: HolidayMonthCaption,
                      DayButton: HolidayDayButton,
                      Nav: () => null,
                    }}
                    classNames={{
                      root: 'w-full',
                      months: 'grid grid-cols-4 gap-x-6 gap-y-5 justify-items-start',
                      month: 'space-y-1',
                      month_caption: '',
                      month_grid: 'w-full border-collapse',
                      weekdays: '',
                      weekday: 'text-xs font-medium text-[var(--G4)] w-7 h-6 text-center',
                      week: '',
                      day: 'p-0',
                    }}
                  />
                </HolidayCtx.Provider>

                {/* Inline add form — shown when a day is selected */}
                <AnimatePresence>
                  {selectedDate && (
                    <motion.div
                      key="add-form"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-3 p-4 bg-[var(--G6)] rounded-lg border border-[var(--G5)]">
                        <span className="text-sm text-[var(--G3)] shrink-0 w-28">
                          {format(selectedDate, 'd MMM yyyy', { locale: es })}
                        </span>
                        <input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                          placeholder={t('holidayNamePlaceholder')}
                          className="flex-1 px-3 py-1.5 text-sm border border-[var(--G5)] rounded bg-white text-[var(--G1)] outline-none focus:border-[var(--P)] placeholder:text-[var(--G4)]"
                        />
                        <Button loading={adding} onClick={handleAdd} className="shrink-0 flex items-center gap-1.5">
                          <Plus size={14} />
                          {t('holidayAdd')}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Holiday list */}
                <div className="divide-y divide-[var(--G6)]">
                  <AnimatePresence mode="sync">
                    {holidays.map((h, i) => (
                      <motion.div
                        key={h.id}
                        custom={i}
                        variants={itemVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="group flex items-center gap-3 py-2 px-1"
                      >
                        <span className="text-xs font-mono text-[var(--G3)] w-28 shrink-0">
                          {format(new Date(h.date + 'T12:00:00'), 'd MMM yyyy', { locale: es })}
                        </span>
                        <span className="flex-1 text-sm text-[var(--G1)]">{h.name}</span>
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--G3)] hover:text-red-500"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {holidays.length === 0 && (
                    <p className="text-sm text-[var(--G3)] py-6 text-center">{tCommon('noData')}</p>
                  )}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </motion.div>

      {/* SAH formula card */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-[var(--G1)]">{t('sahTitle')}</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <p className="font-mono text-sm bg-[var(--G6)] px-4 py-3 rounded text-[var(--P)] font-semibold">
                {t('sahFormula')}
              </p>
              <p className="text-xs text-[var(--G3)]">{t('sahExplain')}</p>
              <p className="text-xs text-[var(--G4)]">P1 ≈ días 1–15 · P2 ≈ días 16–fin de mes</p>
            </div>
          </CardBody>
        </Card>
      </motion.div>

    </motion.div>
  );
}
