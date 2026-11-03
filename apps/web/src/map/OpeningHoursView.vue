<script setup lang="ts">
import {
  WEEKDAYS,
  openingStatus,
  parseOpeningHours,
  periodFor,
  type DayKey,
  type OpeningPeriod,
} from '@ecomap/shared';
import { useTranslation } from 'i18next-vue';
import { computed, onBeforeUnmount, ref } from 'vue';
import LinkifiedText from '../components/LinkifiedText.vue';
import { useLanguage } from '../i18n/index.js';
import { isAllDay, monthsLabel, rangesLabel, weekdayName } from './openingHoursText.js';

/**
 * Opening hours as a timetable: whether the place is open right now, then the
 * week with today picked out, one table per season. Text the app cannot read
 * is shown as it was written.
 */
const props = defineProps<{ text: string }>();

const { t } = useTranslation();
const language = useLanguage();

/* Ticks each minute, so "open now" turns into "closed" while the panel is open. */
const now = ref(new Date());
const timer = window.setInterval(() => {
  now.value = new Date();
}, 60_000);
onBeforeUnmount(() => {
  window.clearInterval(timer);
});

const hours = computed(() => parseOpeningHours(props.text));

const status = computed(() => (hours.value ? openingStatus(hours.value, now.value) : null));

const statusText = computed((): { open: boolean; main: string; detail: string } | null => {
  const current = status.value;
  if (!current) return null;
  /* Only seasons are set, and none of them is now: e.g. a summer-only place in winter. */
  if (current.kind === 'unknown') {
    return { open: false, main: t('openingHours.closedSeason'), detail: '' };
  }
  if (current.kind === 'always') return { open: true, main: t('openingHours.always'), detail: '' };
  if (current.kind === 'open') {
    return {
      open: true,
      main: t('openingHours.openNow'),
      detail: current.until === '24:00' ? '' : t('openingHours.until', { time: current.until }),
    };
  }
  const opens = current.opens;
  let detail = '';
  if (opens) {
    if (opens.inDays === 0) detail = t('openingHours.opensToday', { time: opens.at });
    else if (opens.inDays === 1) detail = t('openingHours.opensTomorrow', { time: opens.at });
    else {
      detail = t('openingHours.opensOn', {
        day: weekdayName(opens.day, language.value, 'long'),
        time: opens.at,
      });
    }
  }
  return { open: false, main: t('openingHours.closedNow'), detail };
});

const today = computed(() => WEEKDAYS[(now.value.getDay() + 6) % 7]);
const currentPeriod = computed(() =>
  hours.value ? periodFor(hours.value, now.value.getMonth() + 1) : null,
);

/** The season that applies now comes first. */
const periods = computed((): OpeningPeriod[] => {
  const list = hours.value?.periods ?? [];
  return [...list].sort(
    (a, b) => Number(b === currentPeriod.value) - Number(a === currentPeriod.value),
  );
});

const periodTitle = (period: OpeningPeriod): string =>
  period.months.length === 0
    ? periods.value.length > 1
      ? t('openingHours.restOfYear')
      : ''
    : monthsLabel(period.months, language.value);

const rows = (period: OpeningPeriod): { key: DayKey; label: string; hours: string }[] => [
  ...WEEKDAYS.map((day) => ({
    key: day,
    label: weekdayName(day, language.value, 'long'),
    hours: dayHours(period, day),
  })),
  ...(period.week.PH
    ? [
        {
          key: 'PH' as const,
          label: t('openingHours.publicHolidays'),
          hours: dayHours(period, 'PH'),
        },
      ]
    : []),
];

function dayHours(period: OpeningPeriod, day: DayKey): string {
  const times = period.week[day] ?? [];
  if (times.length === 0) return t('openingHours.closed');
  return isAllDay(times) ? t('openingHours.allDay') : rangesLabel(times);
}
</script>

<template>
  <LinkifiedText v-if="!hours" :text="props.text" tag="span" />

  <div v-else class="opening-hours">
    <p
      v-if="statusText"
      class="opening-hours__status"
      :class="statusText.open ? 'text-success' : 'text-error'"
    >
      <span class="opening-hours__dot" aria-hidden="true" />
      <strong>{{ statusText.main }}</strong>
      <span v-if="statusText.detail" class="text-medium-emphasis"> · {{ statusText.detail }}</span>
    </p>

    <template v-if="!hours.alwaysOpen">
      <section v-for="(period, index) in periods" :key="index" class="opening-hours__period">
        <p v-if="periodTitle(period)" class="text-body-small text-medium-emphasis mb-1">
          {{ periodTitle(period) }}
          <span v-if="period === currentPeriod && periods.length > 1">
            · {{ t('openingHours.now') }}</span
          >
        </p>
        <table class="opening-hours__table">
          <tbody>
            <tr
              v-for="row in rows(period)"
              :key="row.key"
              :class="{
                'opening-hours__today': period === currentPeriod && row.key === today,
              }"
            >
              <th scope="row">{{ row.label }}</th>
              <td>{{ row.hours }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<style scoped>
.opening-hours {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.opening-hours__status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
}

.opening-hours__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: currentColor;
}

.opening-hours__table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.875rem;
}

.opening-hours__table th,
.opening-hours__table td {
  padding: 3px 8px;
  text-align: left;
  font-weight: 400;
}

.opening-hours__table td {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.opening-hours__today {
  background: rgba(var(--v-theme-primary), 0.1);
}

.opening-hours__today th,
.opening-hours__today td {
  font-weight: 600;
}

.opening-hours__today th {
  border-radius: 6px 0 0 6px;
}

.opening-hours__today td {
  border-radius: 0 6px 6px 0;
}
</style>
