"use client";

import { format, parseISO, subMonths } from "date-fns";
import { AlertCircle, CheckCircle, FileX, Loader2, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";
import type { ParsedHealthData } from "~/types/health";
import { HEALTH_DATA_TYPES, METRIC_CATEGORIES } from "~/types/health";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface HealthDataUploadProps {
  onDataParsed: (data: ParsedHealthData[], fileName: string) => void;
  onError: (error: string) => void;
  isUploading?: boolean;
}

interface UploadProgress {
  bytesProcessed: number;
  totalBytes: number;
  recordsProcessed: number;
  percentage: number;
}

// Group health data types by category for filter UI
const dataTypesByCategory = Object.entries(HEALTH_DATA_TYPES).reduce(
  (acc, [key, value]) => {
    const category = Object.entries(METRIC_CATEGORIES).find(([_, catName]) => {
      const categoryMatch = Object.values(HEALTH_DATA_TYPES).find(
        (type) => type === value
      );
      return categoryMatch;
    })?.[0] || "OTHER";
    
    if (!acc[category]) {
      acc[category] = [];
    }
    
    acc[category].push({ key, value });
    return acc;
  },
  {} as Record<string, Array<{ key: string; value: string }>>
);

export function HealthDataUpload({
  onDataParsed,
  onError,
  isUploading,
}: HealthDataUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "processing" | "success" | "error"
  >("idle");
  const [fileName, setFileName] = useState<string>("");
  const [progress, setProgress] = useState<UploadProgress>({
    bytesProcessed: 0,
    totalBytes: 0,
    recordsProcessed: 0,
    percentage: 0,
  });
  
  // Add date range filtering
  const [dateRange, setDateRange] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({
    startDate: null,
    endDate: null,
  });
  
  // Add data type filtering
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);

  // tRPC mutation for saving health data
  const uploadHealthData = api.health.uploadHealthData.useMutation({
    onSuccess: (result) => {
      console.log(`Successfully saved ${result.recordsCreated} health records`);
      setUploadStatus("success");
    },
    onError: (error) => {
      console.error("Failed to save health data:", error);
      setUploadStatus("error");
      onError("Failed to save health data to database: " + error.message);
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      if (!file) return;

      setIsProcessing(true);
      setUploadStatus("uploading");
      setFileName(file.name);
      setProgress({
        bytesProcessed: 0,
        totalBytes: file.size,
        recordsProcessed: 0,
        percentage: 0,
      });

      try {
        // Validate file type
        if (!file.name.toLowerCase().endsWith(".xml")) {
          throw new Error("Please upload a valid Apple Health XML file");
        }

        // Step 1: Upload the file to server
        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const error = (await uploadResponse.json()) as { error?: string };
          throw new Error(error.error ?? "Failed to upload file");
        }

        const { fileId } = (await uploadResponse.json()) as { fileId: string };

        setUploadStatus("processing");

        // Step 2: Process the file with streaming parser
        const parseResponse = await fetch("/api/parse-xml", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            fileId,
            dateRange: {
              startDate: dateRange.startDate,
              endDate: dateRange.endDate
            }
          }),
        });

        if (!parseResponse.ok) {
          throw new Error("Failed to start processing");
        }

        // Step 3: Stream the parsing progress
        const reader = parseResponse.body?.getReader();
        if (!reader) {
          throw new Error("Failed to read response stream");
        }

        let filteredRecords: ParsedHealthData[] = [];
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6)) as {
                    type: string;
                    data?: {
                      bytesProcessed?: number;
                      totalBytes?: number;
                      recordsProcessed?: number;
                      records?: ParsedHealthData[];
                      error?: string;
                    };
                  };

                  if (data.type === "progress" && data.data) {
                    setProgress({
                      bytesProcessed: data.data.bytesProcessed ?? 0,
                      totalBytes: data.data.totalBytes ?? file.size,
                      recordsProcessed: data.data.recordsProcessed ?? 0,
                      percentage: Math.round(
                        ((data.data.bytesProcessed ?? 0) / file.size) * 100,
                      ),
                    });
                  } else if (data.type === "record" && data.data?.records) {
                    // Process batch of records
                    filteredRecords = [...filteredRecords, ...data.data.records];
                  } else if (data.type === "complete" && data.data) {
                    // Add any final records
                    if (data.data.records) {
                      filteredRecords = [...filteredRecords, ...data.data.records];
                    }
                    
                    setProgress({
                      bytesProcessed: file.size,
                      totalBytes: file.size,
                      recordsProcessed: data.data.recordsProcessed ?? 0,
                      percentage: 100,
                    });
                  } else if (data.type === "error") {
                    throw new Error(data.data?.error ?? "Processing failed");
                  }
                } catch (parseError) {
                  console.warn("Failed to parse streaming data:", parseError);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        // Save health data to database via tRPC
        await uploadHealthData.mutateAsync({
          fileName: file.name,
          fileSize: file.size,
          healthRecords: filteredRecords,
        });

        console.log(`Successfully processed ${filteredRecords.length} records, calling onDataParsed callback`);
        setUploadStatus("success");
        onDataParsed(filteredRecords, file.name);
      } catch (error) {
        console.error("Upload error:", error);
        setUploadStatus("error");
        onError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [onDataParsed, onError, uploadHealthData, dateRange.startDate, dateRange.endDate],
  );

  // Apply the isUploading prop from parent component
  useEffect(() => {
    if (isUploading) {
      setUploadStatus("processing");
    }
  }, [isUploading]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop: useCallback(
        // Explicitly cast as any to avoid TypeScript errors with async function
        onDrop as any,
        [onDataParsed, onError, uploadHealthData, dateRange.startDate, dateRange.endDate],
      ),
      accept: {
        "text/xml": [".xml"],
        "application/xml": [".xml"],
      },
      multiple: false,
      disabled: isProcessing,
    });

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case "uploading":
      case "processing":
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case "error":
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      default:
        return isDragReject ? (
          <FileX className="h-8 w-8 text-red-400" />
        ) : (
          <Upload className="h-8 w-8 text-gray-400" />
        );
    }
  };

  const getStatusText = () => {
    if (uploadStatus === "uploading") return `Uploading ${fileName}...`;
    if (uploadStatus === "processing") {
      if (progress.recordsProcessed > 0) {
        return `Processing ${fileName}... (${progress.recordsProcessed.toLocaleString()} records processed)`;
      }
      return `Processing ${fileName}...`;
    }
    if (uploadStatus === "success") return `Successfully processed ${fileName}`;
    if (uploadStatus === "error") return `Failed to process ${fileName}`;
    if (isDragReject) return "Only XML files are supported";
    if (isDragActive) return "Drop your Apple Health export here";
    return "Drag & drop your Apple Health XML file here, or click to browse";
  };

  const getBorderColor = () => {
    if (uploadStatus === "error" || isDragReject) return "border-red-300";
    if (uploadStatus === "success") return "border-green-300";
    if (isDragActive) return "border-blue-400";
    return "border-gray-300";
  };

  const getBackgroundColor = () => {
    if (uploadStatus === "error" || isDragReject) return "bg-red-50";
    if (uploadStatus === "success") return "bg-green-50";
    if (isDragActive) return "bg-blue-50";
    return "bg-gray-50";
  };

  const formatFileSize = (bytes: number) => {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Upload Filters */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Import Options</CardTitle>
          <CardDescription>Customize your Apple Health data import</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range Filter */}
          <div className="space-y-2">
            <Label htmlFor="startDate">Date Range</Label>
            <div className="flex flex-wrap gap-2">
              <div className="flex-1">
                <Input
                  type="date"
                  id="startDate"
                  placeholder="Start Date"
                  value={dateRange.startDate ?? ""}
                  onChange={(e) => 
                    setDateRange(prev => ({ ...prev, startDate: e.target.value || null }))
                  }
                />
              </div>
              <div className="flex-1">
                <Input
                  type="date"
                  id="endDate"
                  placeholder="End Date"
                  value={dateRange.endDate ?? ""}
                  onChange={(e) => 
                    setDateRange(prev => ({ ...prev, endDate: e.target.value || null }))
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const threeMonthsAgo = format(subMonths(new Date(), 3), "yyyy-MM-dd");
                    setDateRange({ startDate: threeMonthsAgo, endDate: format(new Date(), "yyyy-MM-dd") });
                  }}
                  size="sm"
                >
                  Last 3 Months
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setDateRange({ startDate: null, endDate: null })}
                  size="sm"
                >
                  All Data
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-all duration-200 ${getBorderColor()} ${getBackgroundColor()} ${isProcessing ? "cursor-not-allowed opacity-75" : "hover:border-blue-400 hover:bg-blue-50"} `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center space-y-4">
          {getStatusIcon()}

          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-700">
              {getStatusText()}
            </p>
            
            {dateRange.startDate && dateRange.endDate && (
              <p className="text-sm text-blue-600">
                Filtering data from {format(parseISO(dateRange.startDate), "MMM d, yyyy")} to{" "}
                {format(parseISO(dateRange.endDate), "MMM d, yyyy")}
              </p>
            )}

            {(uploadStatus === "uploading" || uploadStatus === "processing") &&
              progress.totalBytes > 0 && (
                <div className="w-full max-w-md space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>
                      {formatFileSize(progress.bytesProcessed)} /{" "}
                      {formatFileSize(progress.totalBytes)}
                    </span>
                    <span>{progress.percentage}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300 ease-out"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  {progress.recordsProcessed > 0 && (
                    <p className="text-sm text-gray-600">
                      {progress.recordsProcessed.toLocaleString()} records
                      processed
                    </p>
                  )}
                </div>
              )}

            {uploadStatus === "idle" && (
              <p className="text-sm text-gray-500">
                Export your health data from the Apple Health app and upload the
                XML file here.{" "}
                <strong>Large files (up to 5GB) are supported.</strong>
              </p>
            )}
          </div>
        </div>
      </div>

      {uploadStatus === "idle" && (
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h4 className="mb-2 font-medium text-blue-900">
            How to export from Apple Health:
          </h4>
          <ol className="list-inside list-decimal space-y-1 text-sm text-blue-700">
            <li>Open the Health app on your iPhone</li>
            <li>Tap your profile picture in the top right</li>
            <li>Tap &ldquo;Export All Health Data&rdquo;</li>
            <li>Share the export.xml file to your computer</li>
            <li>
              Upload the file here (large files are processed on the server)
            </li>
          </ol>
        </div>
      )}

      {uploadStatus === "success" && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <h4 className="mb-2 font-medium text-green-900">
            Processing Complete!
          </h4>
          <p className="text-sm text-green-700">
            Successfully processed {progress.recordsProcessed.toLocaleString()}{" "}
            health records from your Apple Health export. You can now view your
            health data visualizations.
          </p>
        </div>
      )}
    </div>
  );
}
