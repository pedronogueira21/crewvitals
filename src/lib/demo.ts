// "Load demo mission": 30 days of simulated crew data ending today.
// Fixed seed, so every judge sees the same mission.
import type { Entry } from '../types'
import { addDays } from './mission'

const DAYS = 30

// Deliberate anomalies, by mission day. Every other value stays green.
// Day 30 ends with sleep red, heart rate and mood yellow, so the dashboard shows
// all three colours, a sleep-debt alert (days 28-30) and a cardiovascular trend
// alert (heart rate yellow on days 28-30).
const ANOMALIES: Record<number, Partial<Entry>> = {
  6: { temperatureC: 37.7 }, // yellow
  7: { temperatureC: 38.4 }, // red
  12: { glucose: 152, glucoseFasting: false }, // yellow (non-fasting)
  17: { systolic: 134, diastolic: 82 }, // yellow
  18: { systolic: 143, diastolic: 91 }, // red
  22: { mood: 3 }, // yellow
  26: { sleepHours: 6.5 }, // yellow
  28: { sleepHours: 5.5, heartRate: 104, mood: 3 },
  29: { sleepHours: 5.0, heartRate: 107, mood: 3 },
  30: { sleepHours: 5.5, heartRate: 105, mood: 3 },
}

export function demoMission(today: string): { missionStart: string; entries: Entry[] } {
  const missionStart = addDays(today, -(DAYS - 1))
  let seed = 20261114
  const random = () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32
  const around = (base: number, spread: number, decimals = 0) =>
    Number((base + (random() * 2 - 1) * spread).toFixed(decimals))

  const entries = Array.from({ length: DAYS }, (_, i): Entry => ({
    missionDay: i + 1,
    date: addDays(missionStart, i),
    systolic: around(116, 6),
    diastolic: around(73, 4),
    heartRate: around(64, 5),
    glucose: around(87, 6),
    glucoseFasting: true,
    temperatureC: around(36.7, 0.3, 1),
    sleepHours: around(7.6, 0.4, 1),
    mood: random() < 0.6 ? 4 : 5,
    simulated: true,
    ...ANOMALIES[i + 1],
  }))
  return { missionStart, entries }
}
