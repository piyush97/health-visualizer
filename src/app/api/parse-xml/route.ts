import { currentUser } from "@clerk/nextjs/server";
import { createReadStream, unlink } from "fs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import path from "path";
import sax from "sax";
import { promisify } from "util";
import type { ParsedHealthData } from "~/types/health";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

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

  const { fileId, fileName } = (await request.json()) as {
    fileId: string;
    fileName?: string;
  };

  if (!fileId) {
    return NextResponse.json({ error: "File ID is required" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "uploads", `${fileId}.xml`);

  // Create a streaming response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      processXMLFile(filePath, controller, encoder).catch((error) => {
        const errorUpdate: StreamingProgressUpdate = {
          type: "error",
          data: { error: error.message },
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorUpdate)}\n\n`),
        );
        controller.close();
      });
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
) {
  return new Promise<void>((resolve, reject) => {
    const records: ParsedHealthData[] = [];
    let bytesProcessed = 0;
    let totalBytes = 0;
    let recordsProcessed = 0;
    let currentRecord: Partial<ParsedHealthData> = {};
    let isInRecord = false;
    let isInWorkout = false;

    // Get file size
    const fs = require("fs");
    const stats = fs.statSync(filePath);
    totalBytes = stats.size;

    // Create SAX parser for streaming
    const parser = sax.createStream(true, {
      lowercase: true,
      normalize: true,
    });

    parser.on("opentag", (node: sax.Tag) => {
      if (node.name === "record") {
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
        isInWorkout = true;
        const attrs = node.attributes;

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

      // Send progress updates every 1000 records
      if (recordsProcessed % 1000 === 0) {
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

    parser.on("error", (error) => {
      reject(new Error(`XML parsing error: ${error.message}`));
    });

    parser.on("end", async () => {
      try {
        // Send final batch of records
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

        // Clean up the uploaded file
        await unlinkAsync(filePath);

        controller.close();
        resolve();
      } catch (error) {
        reject(error);
      }
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
