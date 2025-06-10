export interface HealthRecord {
  id: string;
  type: string;
  value: string;
  unit?: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  uploadId: string;
  userId: string;
}

export interface HealthDataUpload {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  processedAt?: Date;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  userId: string;
  healthRecords?: HealthRecord[];
}

export interface ParsedHealthData {
  type: string;
  value: string;
  unit?: string;
  startDate: string;
  endDate: string;
  sourceName?: string;
  sourceVersion?: string;
}

export interface HealthMetric {
  type: string;
  displayName: string;
  unit: string;
  category: string;
  data: Array<{
    date: string;
    value: number;
  }>;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: "USER" | "ASSISTANT";
  createdAt: Date;
  userId: string;
}

// Apple Health Data Types
export const HEALTH_DATA_TYPES = {
  STEP_COUNT: "HKQuantityTypeIdentifierStepCount",
  DISTANCE_WALKING_RUNNING: "HKQuantityTypeIdentifierDistanceWalkingRunning",
  ACTIVE_ENERGY_BURNED: "HKQuantityTypeIdentifierActiveEnergyBurned",
  BASAL_ENERGY_BURNED: "HKQuantityTypeIdentifierBasalEnergyBurned",
  HEART_RATE: "HKQuantityTypeIdentifierHeartRate",
  HEART_RATE_VARIABILITY: "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
  RESTING_HEART_RATE: "HKQuantityTypeIdentifierRestingHeartRate",
  BODY_MASS: "HKQuantityTypeIdentifierBodyMass",
  HEIGHT: "HKQuantityTypeIdentifierHeight",
  BODY_MASS_INDEX: "HKQuantityTypeIdentifierBodyMassIndex",
  BODY_FAT_PERCENTAGE: "HKQuantityTypeIdentifierBodyFatPercentage",
  SLEEP_ANALYSIS: "HKCategoryTypeIdentifierSleepAnalysis",
  BLOOD_PRESSURE_SYSTOLIC: "HKQuantityTypeIdentifierBloodPressureSystolic",
  BLOOD_PRESSURE_DIASTOLIC: "HKQuantityTypeIdentifierBloodPressureDiastolic",
  RESPIRATORY_RATE: "HKQuantityTypeIdentifierRespiratoryRate",
  OXYGEN_SATURATION: "HKQuantityTypeIdentifierOxygenSaturation",
  FLIGHTS_CLIMBED: "HKQuantityTypeIdentifierFlightsClimbed",
  STAND_HOURS: "HKQuantityTypeIdentifierAppleStandHours",
  EXERCISE_TIME: "HKQuantityTypeIdentifierAppleExerciseTime",
  ENVIRONMENTAL_AUDIO_EXPOSURE:
    "HKQuantityTypeIdentifierEnvironmentalAudioExposure",
  HEADPHONE_AUDIO_EXPOSURE: "HKQuantityTypeIdentifierHeadphoneAudioExposure",
  MINDFUL_MINUTES: "HKCategoryTypeIdentifierMindfulSession",
} as const;

export const METRIC_CATEGORIES = {
  ACTIVITY: "Activity",
  BODY: "Body Measurements",
  VITALS: "Vitals",
  SLEEP: "Sleep",
  NUTRITION: "Nutrition",
  HEARING: "Hearing",
  MINDFULNESS: "Mindfulness",
} as const;

export const METRIC_DISPLAY_NAMES: Record<
  string,
  { name: string; category: string }
> = {
  [HEALTH_DATA_TYPES.STEP_COUNT]: {
    name: "Steps",
    category: METRIC_CATEGORIES.ACTIVITY,
  },
  [HEALTH_DATA_TYPES.DISTANCE_WALKING_RUNNING]: {
    name: "Walking + Running Distance",
    category: METRIC_CATEGORIES.ACTIVITY,
  },
  [HEALTH_DATA_TYPES.ACTIVE_ENERGY_BURNED]: {
    name: "Active Energy",
    category: METRIC_CATEGORIES.ACTIVITY,
  },
  [HEALTH_DATA_TYPES.BASAL_ENERGY_BURNED]: {
    name: "Resting Energy",
    category: METRIC_CATEGORIES.ACTIVITY,
  },
  [HEALTH_DATA_TYPES.HEART_RATE]: {
    name: "Heart Rate",
    category: METRIC_CATEGORIES.VITALS,
  },
  [HEALTH_DATA_TYPES.BODY_MASS]: {
    name: "Weight",
    category: METRIC_CATEGORIES.BODY,
  },
  [HEALTH_DATA_TYPES.HEIGHT]: {
    name: "Height",
    category: METRIC_CATEGORIES.BODY,
  },
  [HEALTH_DATA_TYPES.BODY_MASS_INDEX]: {
    name: "BMI",
    category: METRIC_CATEGORIES.BODY,
  },
  [HEALTH_DATA_TYPES.SLEEP_ANALYSIS]: {
    name: "Sleep",
    category: METRIC_CATEGORIES.SLEEP,
  },
  [HEALTH_DATA_TYPES.BLOOD_PRESSURE_SYSTOLIC]: {
    name: "Blood Pressure (Systolic)",
    category: METRIC_CATEGORIES.VITALS,
  },
  [HEALTH_DATA_TYPES.BLOOD_PRESSURE_DIASTOLIC]: {
    name: "Blood Pressure (Diastolic)",
    category: METRIC_CATEGORIES.VITALS,
  },
  [HEALTH_DATA_TYPES.RESPIRATORY_RATE]: {
    name: "Respiratory Rate",
    category: METRIC_CATEGORIES.VITALS,
  },
  [HEALTH_DATA_TYPES.OXYGEN_SATURATION]: {
    name: "Oxygen Saturation",
    category: METRIC_CATEGORIES.VITALS,
  },
  [HEALTH_DATA_TYPES.HEART_RATE_VARIABILITY]: {
    name: "Heart Rate Variability",
    category: METRIC_CATEGORIES.VITALS,
  },
  [HEALTH_DATA_TYPES.RESTING_HEART_RATE]: {
    name: "Resting Heart Rate",
    category: METRIC_CATEGORIES.VITALS,
  },
  [HEALTH_DATA_TYPES.BODY_FAT_PERCENTAGE]: {
    name: "Body Fat Percentage",
    category: METRIC_CATEGORIES.BODY,
  },
  [HEALTH_DATA_TYPES.FLIGHTS_CLIMBED]: {
    name: "Flights Climbed",
    category: METRIC_CATEGORIES.ACTIVITY,
  },
  [HEALTH_DATA_TYPES.STAND_HOURS]: {
    name: "Stand Hours",
    category: METRIC_CATEGORIES.ACTIVITY,
  },
  [HEALTH_DATA_TYPES.EXERCISE_TIME]: {
    name: "Exercise Minutes",
    category: METRIC_CATEGORIES.ACTIVITY,
  },
  [HEALTH_DATA_TYPES.ENVIRONMENTAL_AUDIO_EXPOSURE]: {
    name: "Environmental Noise Exposure",
    category: METRIC_CATEGORIES.HEARING,
  },
  [HEALTH_DATA_TYPES.HEADPHONE_AUDIO_EXPOSURE]: {
    name: "Headphone Audio Exposure",
    category: METRIC_CATEGORIES.HEARING,
  },
  [HEALTH_DATA_TYPES.MINDFUL_MINUTES]: {
    name: "Mindful Minutes",
    category: METRIC_CATEGORIES.MINDFULNESS,
  },
};
