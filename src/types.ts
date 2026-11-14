// Data model from SPEC.md section 7. Stored in localStorage only.

export type Entry = {
  missionDay: number
  date: string // ISO calendar date, YYYY-MM-DD
  systolic?: number
  diastolic?: number
  heartRate?: number
  glucose?: number
  glucoseFasting?: boolean
  temperatureC?: number
  sleepHours?: number
  mood?: 1 | 2 | 3 | 4 | 5
  simulated: boolean
}

export type Settings = {
  missionStart: string // ISO calendar date, YYYY-MM-DD
  setting: 'ISS' | 'Lunar surface' | 'Mars transit'
}
