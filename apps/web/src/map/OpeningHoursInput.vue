<script setup lang="ts">
import {
  WEEKDAYS,
  formatOpeningHours,
  parseOpeningHours,
  type DayKey,
  type OpeningHours,
  type OpeningPeriod,
  type TimeRange,
  type Weekday,
  type WeekSchedule,
} from '@ecomap/shared';
import { mdiClose, mdiContentCopy, mdiDeleteOutline, mdiPlus } from '@mdi/js';
import { useTranslation } from 'i18next-vue';
import { computed, ref } from 'vue';
import { useLanguage } from '../i18n/index.js';
import { monthName, weekdayName } from './openingHoursText.js';

/**
 * A weekly timetable for opening hours, with the browser's own time pickers:
 * tick the days a place is open, set from and to, add a second range for a
 * lunch break, and - for summer-only or winter hours - add a season. It reads
 * and writes OpenStreetMap opening_hours text, so the stored value stays the
 * standard one.
 */
const props = defineProps<{
  value: string;
  label: string;
  error: string | undefined;
  hint: string | undefined;
}>();
const emit = defineEmits<{ change: [value: string] }>();

const { t } = useTranslation();
const language = useLanguage();

const emptyHours = (): OpeningHours => ({ alwaysOpen: false, periods: [{ months: [], week: {} }] });

const parsed = props.value ? parseOpeningHours(props.value) : null;
const hours = ref<OpeningHours>(parsed ?? emptyHours());
/** Text written some other way, which the timetable cannot show; kept until replaced. */
const unreadable = ref(props.value.trim() !== '' && parsed === null);

/** A day taken out of the timetable: closed, or for public holidays "as usual". */
const withoutDay = (week: WeekSchedule, day: DayKey): WeekSchedule =>
  Object.fromEntries(Object.entries(week).filter(([key]) => key !== day));

const DEFAULT_RANGE: TimeRange = { from: '09:00', to: '17:00' };

const commit = (): void => {
  unreadable.value = false;
  if (!hours.value.alwaysOpen && hours.value.periods.length === 0) {
    hours.value.periods.push({ months: [], week: {} });
  }
  emit('change', formatOpeningHours(hours.value));
};

const setAlwaysOpen = (value: boolean | null): void => {
  hours.value.alwaysOpen = value === true;
  commit();
};

const isOpen = (period: OpeningPeriod, day: DayKey): boolean => (period.week[day]?.length ?? 0) > 0;

/** Opening a day copies the hours of the nearest open day before it. */
const toggleDay = (period: OpeningPeriod, day: Weekday, open: boolean | null): void => {
  if (open) {
    const before = WEEKDAYS.slice(0, WEEKDAYS.indexOf(day)).reverse();
    const source = before.find((other) => isOpen(period, other));
    const ranges = source ? (period.week[source] ?? []) : [DEFAULT_RANGE];
    period.week[day] = ranges.map((range) => ({ ...range }));
  } else {
    period.week = withoutDay(period.week, day);
  }
  commit();
};

const setTime = (range: TimeRange, end: 'from' | 'to', value: string): void => {
  if (!/^\d{2}:\d{2}$/u.test(value)) return;
  /* "00:00" as a closing time means midnight at the end of the day. */
  range[end] = end === 'to' && value === '00:00' ? '24:00' : value;
  commit();
};

/** The time picker cannot show 24:00; it shows the same moment as 00:00. */
const pickerValue = (time: string): string => (time === '24:00' ? '00:00' : time);

const addRange = (period: OpeningPeriod, day: DayKey): void => {
  const ranges = period.week[day] ?? [];
  const last = ranges.at(-1);
  ranges.push(
    last
      ? {
          from: last.to === '24:00' ? '23:00' : last.to,
          to: last.to === '24:00' ? '24:00' : '22:00',
        }
      : { ...DEFAULT_RANGE },
  );
  period.week[day] = ranges;
  commit();
};

const removeRange = (period: OpeningPeriod, day: DayKey, index: number): void => {
  const ranges = period.week[day] ?? [];
  ranges.splice(index, 1);
  if (ranges.length === 0) period.week = withoutDay(period.week, day);
  commit();
};

/** Monday's hours on every weekday, the usual shape of a shop's week. */
const copyMondayToWeekdays = (period: OpeningPeriod): void => {
  const monday = period.week.Mo ?? [];
  for (const day of ['Tu', 'We', 'Th', 'Fr'] as const) {
    period.week[day] = monday.map((range) => ({ ...range }));
  }
  commit();
};

type HolidayMode = 'usual' | 'closed' | 'special';

const holidayMode = (period: OpeningPeriod): HolidayMode => {
  const ranges = period.week.PH;
  if (!ranges) return 'usual';
  return ranges.length === 0 ? 'closed' : 'special';
};

const setHolidayMode = (period: OpeningPeriod, mode: HolidayMode): void => {
  if (mode === 'usual') delete period.week.PH;
  else if (mode === 'closed') period.week.PH = [];
  else period.week.PH = [{ ...DEFAULT_RANGE }];
  commit();
};

const holidayItems = computed(() => [
  { title: t('openingHours.holidaysUsual'), value: 'usual' },
  { title: t('openingHours.holidaysClosed'), value: 'closed' },
  { title: t('openingHours.holidaysSpecial'), value: 'special' },
]);

const monthItems = computed(() =>
  Array.from({ length: 12 }, (_, index) => ({
    title: monthName(index + 1, language.value, 'long'),
    value: index + 1,
  })),
);

/** A second season starts with the summer months nobody has claimed yet. */
const addSeason = (): void => {
  const used = new Set(hours.value.periods.flatMap((period) => period.months));
  const months = [6, 7, 8].filter((month) => !used.has(month));
  hours.value.periods.push({ months: months.length > 0 ? months : [], week: {} });
  commit();
};

const removeSeason = (index: number): void => {
  hours.value.periods.splice(index, 1);
  commit();
};

const setMonths = (period: OpeningPeriod, months: number[]): void => {
  period.months = [...months].sort((a, b) => a - b);
  commit();
};

const hasSeasons = computed(() => hours.value.periods.length > 1);
</script>

<template>
  <fieldset class="opening-hours-input">
    <legend class="text-body-large mb-1">{{ props.label }}</legend>
    <p v-if="props.hint" class="text-body-small text-medium-emphasis mb-2">{{ props.hint }}</p>

    <v-alert v-if="unreadable" type="info" variant="tonal" density="compact" class="mb-3">
      {{ t('openingHours.unreadable') }}
      <code class="d-block mt-1">{{ props.value }}</code>
    </v-alert>

    <v-switch
      :model-value="hours.alwaysOpen"
      :label="t('openingHours.alwaysOpenSwitch')"
      color="primary"
      density="compact"
      hide-details
      @update:model-value="setAlwaysOpen"
    />

    <template v-if="!hours.alwaysOpen">
      <v-card
        v-for="(period, periodIndex) in hours.periods"
        :key="periodIndex"
        variant="outlined"
        class="pa-3 mt-3"
      >
        <div v-if="hasSeasons" class="d-flex align-start ga-2 mb-2">
          <v-select
            v-if="period.months.length > 0 || periodIndex > 0"
            :model-value="period.months"
            :items="monthItems"
            :label="t('openingHours.months')"
            multiple
            chips
            closable-chips
            density="compact"
            hide-details
            @update:model-value="(months: number[]) => setMonths(period, months)"
          />
          <p v-else class="text-title-small flex-grow-1 pt-2">
            {{ t('openingHours.restOfYear') }}
          </p>
          <v-btn
            v-if="periodIndex > 0"
            :icon="mdiDeleteOutline"
            variant="text"
            size="small"
            :aria-label="t('openingHours.removeSeason')"
            @click="removeSeason(periodIndex)"
          />
        </div>

        <div v-for="day in WEEKDAYS" :key="day" class="day-row">
          <v-checkbox-btn
            :model-value="isOpen(period, day)"
            :label="weekdayName(day, language, 'short')"
            color="primary"
            density="compact"
            class="day-row__day"
            @update:model-value="(open: boolean | null) => toggleDay(period, day, open)"
          />
          <div v-if="isOpen(period, day)" class="day-row__ranges">
            <div v-for="(range, index) in period.week[day]" :key="index" class="range">
              <input
                type="time"
                class="time-input"
                :value="pickerValue(range.from)"
                :aria-label="`${weekdayName(day, language, 'long')} ${t('openingHours.from')}`"
                @change="setTime(range, 'from', ($event.target as HTMLInputElement).value)"
              />
              <span aria-hidden="true">–</span>
              <input
                type="time"
                class="time-input"
                :value="pickerValue(range.to)"
                :aria-label="`${weekdayName(day, language, 'long')} ${t('openingHours.to')}`"
                @change="setTime(range, 'to', ($event.target as HTMLInputElement).value)"
              />
              <v-btn
                v-if="(period.week[day]?.length ?? 0) > 1"
                :icon="mdiClose"
                variant="text"
                size="x-small"
                :aria-label="t('openingHours.removeRange')"
                @click="removeRange(period, day, index)"
              />
            </div>
            <v-btn
              v-if="(period.week[day]?.length ?? 0) < 3"
              :icon="mdiPlus"
              variant="text"
              size="x-small"
              :aria-label="t('openingHours.addRange')"
              :title="t('openingHours.addRange')"
              @click="addRange(period, day)"
            />
          </div>
          <span v-else class="text-body-small text-medium-emphasis">
            {{ t('openingHours.closed') }}
          </span>
        </div>

        <div class="d-flex flex-wrap align-center ga-2 mt-2">
          <v-select
            :model-value="holidayMode(period)"
            :items="holidayItems"
            :label="t('openingHours.publicHolidays')"
            density="compact"
            hide-details
            class="holiday-select"
            @update:model-value="(mode: HolidayMode) => setHolidayMode(period, mode)"
          />
          <v-btn
            v-if="isOpen(period, 'Mo')"
            variant="text"
            size="small"
            :prepend-icon="mdiContentCopy"
            @click="copyMondayToWeekdays(period)"
          >
            {{ t('openingHours.copyMonday') }}
          </v-btn>
        </div>

        <div v-if="holidayMode(period) === 'special'" class="day-row mt-2">
          <span class="day-row__day text-body-medium">{{ t('openingHours.publicHolidays') }}</span>
          <div class="day-row__ranges">
            <div v-for="(range, index) in period.week.PH" :key="index" class="range">
              <input
                type="time"
                class="time-input"
                :value="pickerValue(range.from)"
                :aria-label="`${t('openingHours.publicHolidays')} ${t('openingHours.from')}`"
                @change="setTime(range, 'from', ($event.target as HTMLInputElement).value)"
              />
              <span aria-hidden="true">–</span>
              <input
                type="time"
                class="time-input"
                :value="pickerValue(range.to)"
                :aria-label="`${t('openingHours.publicHolidays')} ${t('openingHours.to')}`"
                @change="setTime(range, 'to', ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
        </div>
      </v-card>

      <v-btn variant="text" size="small" class="mt-2" :prepend-icon="mdiPlus" @click="addSeason">
        {{ t('openingHours.addSeason') }}
      </v-btn>
    </template>

    <p v-if="props.error" class="text-body-small text-error mt-1" role="alert">
      {{ props.error }}
    </p>
  </fieldset>
</template>

<style scoped>
.opening-hours-input {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}

.day-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  min-height: 40px;
}

.day-row__day {
  flex: 0 0 96px;
}

.day-row__ranges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
}

.range {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.time-input {
  font: inherit;
  font-size: 0.9rem;
  padding: 4px 6px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  color-scheme: light dark;
  font-variant-numeric: tabular-nums;
}

.time-input:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 1px;
}

.holiday-select {
  max-width: 240px;
}
</style>
