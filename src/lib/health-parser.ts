import xml2js from "xml2js";
import type { ParsedHealthData } from "~/types/health";

export interface AppleHealthExport {
  HealthData: {
    Record?: Array<{
      $: {
        type: string;
        sourceName: string;
        sourceVersion?: string;
        device?: string;
        unit?: string;
        creationDate: string;
        startDate: string;
        endDate: string;
        value: string;
      };
    }>;
    Workout?: Array<{
      $: {
        workoutActivityType: string;
        duration: string;
        durationUnit: string;
        totalDistance?: string;
        totalDistanceUnit?: string;
        totalEnergyBurned?: string;
        totalEnergyBurnedUnit?: string;
        sourceName: string;
        sourceVersion?: string;
        creationDate: string;
        startDate: string;
        endDate: string;
      };
    }>;
  };
}

export class HealthDataParser {
  static async parseXMLFile(file: File): Promise<ParsedHealthData[]> {
    try {
      const xmlText = await file.text();
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(xmlText);

      return this.extractHealthRecords(result as AppleHealthExport);
    } catch (error) {
      console.error("Error parsing XML file:", error);
      throw new Error(
        "Failed to parse XML file. Please ensure it's a valid Apple Health export.",
      );
    }
  }

  private static extractHealthRecords(
    data: AppleHealthExport,
  ): ParsedHealthData[] {
    const records: ParsedHealthData[] = [];

    // Extract health records
    if (data.HealthData?.Record) {
      for (const record of data.HealthData.Record) {
        const attrs = record.$;

        records.push({
          type: attrs.type,
          value: attrs.value,
          unit: attrs.unit,
          startDate: attrs.startDate,
          endDate: attrs.endDate,
          sourceName: attrs.sourceName,
          sourceVersion: attrs.sourceVersion,
        });
      }
    }

    // Extract workout data
    if (data.HealthData?.Workout) {
      for (const workout of data.HealthData.Workout) {
        const attrs = workout.$;

        // Add workout as activity record
        records.push({
          type: "HKWorkout",
          value: attrs.workoutActivityType,
          unit: "workout",
          startDate: attrs.startDate,
          endDate: attrs.endDate,
          sourceName: attrs.sourceName,
          sourceVersion: attrs.sourceVersion,
        });

        // Add workout duration
        if (attrs.duration) {
          records.push({
            type: "HKWorkoutDuration",
            value: attrs.duration,
            unit: attrs.durationUnit || "min",
            startDate: attrs.startDate,
            endDate: attrs.endDate,
            sourceName: attrs.sourceName,
            sourceVersion: attrs.sourceVersion,
          });
        }

        // Add total distance if available
        if (attrs.totalDistance) {
          records.push({
            type: "HKWorkoutTotalDistance",
            value: attrs.totalDistance,
            unit: attrs.totalDistanceUnit || "km",
            startDate: attrs.startDate,
            endDate: attrs.endDate,
            sourceName: attrs.sourceName,
            sourceVersion: attrs.sourceVersion,
          });
        }

        // Add total energy burned if available
        if (attrs.totalEnergyBurned) {
          records.push({
            type: "HKWorkoutTotalEnergyBurned",
            value: attrs.totalEnergyBurned,
            unit: attrs.totalEnergyBurnedUnit || "kcal",
            startDate: attrs.startDate,
            endDate: attrs.endDate,
            sourceName: attrs.sourceName,
            sourceVersion: attrs.sourceVersion,
          });
        }
      }
    }

    return records;
  }

  static validateHealthData(records: ParsedHealthData[]): {
    isValid: boolean;
    errors: string[];
    recordCount: number;
  } {
    const errors: string[] = [];

    if (!records || records.length === 0) {
      errors.push("No health records found in the file");
      return { isValid: false, errors, recordCount: 0 };
    }

    // Check for required fields
    const invalidRecords = records.filter(
      (record) =>
        !record.type || !record.value || !record.startDate || !record.endDate,
    );

    if (invalidRecords.length > 0) {
      errors.push(
        `${invalidRecords.length} records are missing required fields`,
      );
    }

    // Check date format
    const invalidDates = records.filter((record) => {
      try {
        new Date(record.startDate);
        new Date(record.endDate);
        return false;
      } catch {
        return true;
      }
    });

    if (invalidDates.length > 0) {
      errors.push(`${invalidDates.length} records have invalid date formats`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      recordCount: records.length,
    };
  }

  static getDataSummary(records: ParsedHealthData[]): {
    totalRecords: number;
    dateRange: { start: Date; end: Date };
    dataTypes: Record<string, number>;
    sources: Record<string, number>;
  } {
    const dataTypes: Record<string, number> = {};
    const sources: Record<string, number> = {};
    let earliest = new Date();
    let latest = new Date(0);

    for (const record of records) {
      // Count data types
      dataTypes[record.type] = (dataTypes[record.type] || 0) + 1;

      // Count sources
      if (record.sourceName) {
        sources[record.sourceName] = (sources[record.sourceName] || 0) + 1;
      }

      // Track date range
      const startDate = new Date(record.startDate);
      const endDate = new Date(record.endDate);

      if (startDate < earliest) earliest = startDate;
      if (endDate > latest) latest = endDate;
    }

    return {
      totalRecords: records.length,
      dateRange: { start: earliest, end: latest },
      dataTypes,
      sources,
    };
  }
}
