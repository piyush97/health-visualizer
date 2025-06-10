import { currentUser } from "@clerk/nextjs/server";
import { createReadStream, statSync, unlink } from "fs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import path from "path";
import sax from "sax";
import { promisify } from "util";
import type { ParsedHealthData } from "~/types/health";
import { HEALTH_DATA_TYPES } from "~/types/health";

export const runtime = "nodejs";
export const maxDuration = 600; // 10 minutes

const unlinkAsync = promisify(unlink);

interface StreamingProgressUpdate {
  type: "progress" | "record" | "complete" | "error";
  data?: {
    bytesProcessed?: number;
    totalBytes?: number;
    recordsProcessed?: number;
    records?: ParsedHealthData[];
    error?: string;
  };
}

export async function POST(request: NextRequest) {
  // Check authentication
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId, dateRange } = (await request.json()) as {
    fileId: string;
    dateRange?: {
      startDate: string | null;
      endDate: string | null;
    };
  };

  if (!fileId) {
    return NextResponse.json({ error: "File ID is required" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "uploads", `${fileId}.xml`);

  // Create a streaming response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      processXMLFile(filePath, controller, encoder, dateRange).catch(
        (error) => {
          const errorUpdate: StreamingProgressUpdate = {
            type: "error",
            data: {
              error: error instanceof Error ? error.message : String(error),
            },
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorUpdate)}\n\n`),
          );
          controller.close();
        },
      );
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function processXMLFile(
  filePath: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  dateRange?: {
    startDate: string | null;
    endDate: string | null;
  },
) {
  return new Promise<void>((resolve, reject) => {
    const records: ParsedHealthData[] = [];
    let bytesProcessed = 0;
    let totalBytes = 0;
    let recordsProcessed = 0;
    let currentRecord: Partial<ParsedHealthData> = {};
    let isInRecord = false;
    let isInWorkout = false;

    // Define batch size for memory optimization
    const BATCH_SIZE = 5000;

    // Set up date range filtering if provided
    const startDateFilter = dateRange?.startDate
      ? new Date(dateRange.startDate)
      : null;
    const endDateFilter = dateRange?.endDate
      ? new Date(dateRange.endDate)
      : null;

    // Get list of relevant health data types for filtering
    const relevantTypes: string[] = Object.values(HEALTH_DATA_TYPES);

    // Type-safe helper to check if a record type is relevant
    const isRelevantType = (type: string): boolean => {
      return relevantTypes.includes(type);
    };

    // Helper function to check if a record date is within the filter range
    const isWithinDateRange = (startDate: string): boolean => {
      if (!startDateFilter && !endDateFilter) {
        return true; // No date filtering
      }

      const recordDate = new Date(startDate);

      if (startDateFilter && recordDate < startDateFilter) {
        return false;
      }

      if (endDateFilter && recordDate > endDateFilter) {
        return false;
      }

      return true;
    };

    // Get file size
    try {
      const stats = statSync(filePath);
      totalBytes = stats.size;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      reject(error);
      return;
    }

    // Create SAX parser for streaming
    const parser = sax.createStream(true, {
      lowercase: true,
      normalize: true,
    });

    parser.on("opentag", (node: sax.Tag) => {
      if (node.name === "record") {
        // Filter out unwanted record types to save memory
        const recordType = node.attributes.type!;
        const recordStartDate = node.attributes.startdate!;

        // Apply both type and date filters
        if (
          !isRelevantType(recordType) ||
          !isWithinDateRange(recordStartDate)
        ) {
          return;
        }

        isInRecord = true;
        currentRecord = {
          type: node.attributes.type!,
          value: node.attributes.value!,
          unit: node.attributes.unit!,
          startDate: node.attributes.startdate!,
          endDate: node.attributes.enddate!,
          sourceName: node.attributes.sourcename!,
          sourceVersion: node.attributes.sourceversion!,
        };
      } else if (node.name === "workout") {
        const attrs = node.attributes;
        const workoutStartDate = attrs.startdate!;

        // Apply date filter to workouts too
        if (!isWithinDateRange(workoutStartDate)) {
          return;
        }

        isInWorkout = true;

        // Add workout record
        records.push({
          type: "HKWorkout",
          value: attrs.workoutactivitytype!,
          unit: "workout",
          startDate: attrs.startdate!,
          endDate: attrs.enddate!,
          sourceName: attrs.sourcename!,
          sourceVersion: attrs.sourceversion!,
        });

        // Add duration if available
        if (attrs.duration) {
          records.push({
            type: "HKWorkoutDuration",
            value: attrs.duration,
            unit: attrs.durationunit! || "min",
            startDate: attrs.startdate!,
            endDate: attrs.enddate!,
            sourceName: attrs.sourcename!,
            sourceVersion: attrs.sourceversion!,
          });
        }

        recordsProcessed += 1;
      }
    });

    parser.on("closetag", (tagName) => {
      if (tagName === "record" && isInRecord) {
        if (currentRecord.type && currentRecord.value) {
          records.push(currentRecord as ParsedHealthData);
          recordsProcessed += 1;
        }
        isInRecord = false;
        currentRecord = {};
      } else if (tagName === "workout") {
        isInWorkout = false;
      }

      // Process records in batches to save memory
      if (records.length >= BATCH_SIZE) {
        const batchUpdate: StreamingProgressUpdate = {
          type: "record",
          data: {
            records: [...records],
            recordsProcessed,
            bytesProcessed,
            totalBytes,
          },
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(batchUpdate)}\n\n`),
        );

        // Clear the records array to free memory
        records.length = 0;
      }

      // Send progress updates every 5000 records
      if (recordsProcessed % 5000 === 0) {
        const progressUpdate: StreamingProgressUpdate = {
          type: "progress",
          data: {
            bytesProcessed,
            totalBytes,
            recordsProcessed,
          },
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(progressUpdate)}\n\n`),
        );
      }
    });

    parser.on("error", (err) => {
      const error = err instanceof Error ? err : new Error(String(err));
      reject(error);
    });

    parser.on("end", () => {
      // Send final batch of records if any remain
      if (records.length > 0) {
        const completeUpdate: StreamingProgressUpdate = {
          type: "complete",
          data: {
            records,
            recordsProcessed,
            bytesProcessed: totalBytes,
            totalBytes,
          },
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(completeUpdate)}\n\n`),
        );
      } else {
        // If all records were already sent in batches, just send a completion signal
        const completeUpdate: StreamingProgressUpdate = {
          type: "complete",
          data: {
            records: [],
            recordsProcessed,
            bytesProcessed: totalBytes,
            totalBytes,
          },
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(completeUpdate)}\n\n`),
        );
      }

      // Clean up the uploaded file (wrap in try/catch to avoid unhandled rejection)
      try {
        void unlinkAsync(filePath).catch((err) =>
          console.error(
            `Failed to delete file: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
      } catch (err) {
        console.error(
          `Error cleaning up file: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      controller.close();
      resolve();
    });

    // Create read stream and pipe to parser
    const readStream = createReadStream(filePath);

    readStream.on("data", (chunk) => {
      bytesProcessed += chunk.length;
    });

    readStream.on("error", (error) => {
      reject(new Error(`File read error: ${error.message}`));
    });

    readStream.pipe(parser);
  });
}
