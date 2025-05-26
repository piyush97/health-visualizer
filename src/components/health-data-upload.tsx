"use client";

import { AlertCircle, CheckCircle, FileX, Loader2, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { HealthDataParser } from "~/lib/health-parser";
import type { ParsedHealthData } from "~/types/health";

interface HealthDataUploadProps {
  onDataParsed: (data: ParsedHealthData[], fileName: string) => void;
  onError: (error: string) => void;
}

export function HealthDataUpload({
  onDataParsed,
  onError,
}: HealthDataUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [fileName, setFileName] = useState<string>("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      if (!file) return;

      setIsProcessing(true);
      setUploadStatus("processing");
      setFileName(file.name);

      try {
        // Validate file type
        if (!file.name.toLowerCase().endsWith(".xml")) {
          throw new Error("Please upload a valid Apple Health XML file");
        }

        // Parse the health data
        const parsedData = await HealthDataParser.parseXMLFile(file);

        // Validate the parsed data
        const validation = HealthDataParser.validateHealthData(parsedData);

        if (!validation.isValid) {
          throw new Error(
            `Invalid health data: ${validation.errors.join(", ")}`,
          );
        }

        setUploadStatus("success");
        onDataParsed(parsedData, file.name);
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
    [onDataParsed, onError],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        "text/xml": [".xml"],
        "application/xml": [".xml"],
      },
      multiple: false,
      disabled: isProcessing,
    });

  const getStatusIcon = () => {
    switch (uploadStatus) {
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
    if (isProcessing) return `Processing ${fileName}...`;
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

  return (
    <div className="mx-auto w-full max-w-2xl">
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

            {uploadStatus === "idle" && (
              <p className="text-sm text-gray-500">
                Export your health data from the Apple Health app and upload the
                XML file here
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
            <li>Tap "Export All Health Data"</li>
            <li>Share the export.xml file to your computer</li>
            <li>Upload the file here</li>
          </ol>
        </div>
      )}
    </div>
  );
}
