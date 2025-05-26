"use client";

import { useUser } from "@clerk/nextjs";
import {
  Activity,
  Heart,
  MessageSquare,
  TrendingUp,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { HealthChatbot } from "~/components/health-chatbot";
import { HealthDataUpload } from "~/components/health-data-upload";
import { HealthDataVisualization } from "~/components/health-data-visualization";
import { api } from "~/trpc/react";
import type { ParsedHealthData } from "~/types/health";
import { METRIC_DISPLAY_NAMES } from "~/types/health";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<"upload" | "visualize" | "chat">(
    "upload",
  );
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [uploadedData, setUploadedData] = useState<ParsedHealthData[]>([]);

  // API queries
  const { data: healthRecords, refetch: refetchRecords } =
    api.health.getHealthRecords.useQuery(
      { limit: 5000 },
      { enabled: !!user?.id },
    );

  const { data: healthSummary } = api.health.getHealthSummary.useQuery(
    undefined,
    { enabled: !!user?.id },
  );

  const { data: availableDataTypes } =
    api.health.getAvailableDataTypes.useQuery(undefined, {
      enabled: !!user?.id,
    });

  const { data: uploads } = api.health.getUploads.useQuery(undefined, {
    enabled: !!user?.id,
  });

  // Mutations
  const uploadMutation = api.health.uploadHealthData.useMutation({
    onSuccess: () => {
      void refetchRecords();
      setActiveTab("visualize");
    },
  });

  const handleDataParsed = async (
    data: ParsedHealthData[],
    fileName: string,
  ) => {
    setUploadedData(data);

    if (user?.id) {
      try {
        await uploadMutation.mutateAsync({
          fileName,
          fileSize: data.length,
          healthRecords: data,
        });
      } catch (error) {
        console.error("Upload failed:", error);
      }
    }
  };

  const handleUploadError = (error: string) => {
    console.error("Upload error:", error);
    // You might want to show a toast notification here
  };

  // Auto-select some common metrics when data is loaded
  useEffect(() => {
    if (
      availableDataTypes &&
      availableDataTypes.length > 0 &&
      selectedMetrics.length === 0
    ) {
      const commonMetrics = availableDataTypes
        .filter((dt) =>
          [
            "HKQuantityTypeIdentifierStepCount",
            "HKQuantityTypeIdentifierHeartRate",
            "HKQuantityTypeIdentifierActiveEnergyBurned",
          ].includes(dt.type),
        )
        .map((dt) => dt.type)
        .slice(0, 3);

      setSelectedMetrics(commonMetrics);
    }
  }, [availableDataTypes, selectedMetrics]);

  if (!isLoaded || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Heart className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Health Visualizer
          </h1>
          <p className="mb-4 text-gray-600">
            Please sign in to access your health dashboard
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "upload" as const, name: "Upload Data", icon: Upload },
    { id: "visualize" as const, name: "Visualize", icon: TrendingUp },
    { id: "chat" as const, name: "Health Assistant", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-blue-500" />
              <h1 className="text-2xl font-bold text-gray-900">
                Health Visualizer
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome,{" "}
                {user.firstName ?? user.emailAddresses[0]?.emailAddress}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Summary Stats */}
      {healthSummary && (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Records
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {healthSummary.totalRecords.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center">
                <Heart className="h-8 w-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Data Types
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.keys(healthSummary.dataTypes).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Date Range
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {healthSummary.dateRange.start.toLocaleDateString()} -{" "}
                    {healthSummary.dateRange.end.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`flex items-center border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="mr-2 h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "upload" && (
          <div className="py-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Upload Apple Health Data
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Export your data from the Apple Health app and upload the XML
                  file here.
                </p>
              </div>

              <HealthDataUpload
                onDataParsed={handleDataParsed}
                onError={handleUploadError}
                isUploading={uploadMutation.isPending}
              />

              {/* Recent Uploads */}
              {uploads && uploads.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900">
                    Recent Uploads
                  </h3>
                  <div className="mt-4 overflow-hidden rounded-lg bg-white shadow">
                    <ul className="divide-y divide-gray-200">
                      {uploads.slice(0, 5).map((upload) => (
                        <li key={upload.id} className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {upload.fileName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {upload.uploadedAt.toLocaleDateString()}{" "}
                                {upload.uploadedAt.toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="flex items-center">
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                  upload.status === "COMPLETED"
                                    ? "bg-green-100 text-green-800"
                                    : upload.status === "PROCESSING"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                }`}
                              >
                                {upload.status}
                              </span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "visualize" && (
          <div className="py-6">
            {availableDataTypes && availableDataTypes.length > 0 ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Health Data Visualization
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Select health metrics to visualize your data patterns.
                  </p>
                </div>

                {/* Data Type Selection */}
                <div>
                  <h3 className="text-md font-medium text-gray-900">
                    Available Data Types
                  </h3>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {availableDataTypes.map((dataType) => (
                      <label
                        key={dataType.type}
                        className="flex items-center space-x-3"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedMetrics.includes(dataType.type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMetrics((prev) => [
                                ...prev,
                                dataType.type,
                              ]);
                            } else {
                              setSelectedMetrics((prev) =>
                                prev.filter((m) => m !== dataType.type),
                              );
                            }
                          }}
                        />
                        <span className="text-sm text-gray-700">
                          {METRIC_DISPLAY_NAMES[dataType.type]?.name ??
                            dataType.type}{" "}
                          ({dataType.count} records)
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Visualization */}
                {selectedMetrics.length > 0 && healthRecords && (
                  <HealthDataVisualization
                    healthRecords={healthRecords}
                    selectedMetrics={selectedMetrics}
                  />
                )}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No health data
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Upload your Apple Health data to start visualizing.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                    onClick={() => setActiveTab("upload")}
                  >
                    <Upload className="mr-1.5 -ml-0.5 h-5 w-5" />
                    Upload Data
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "chat" && user?.id && (
          <div className="space-y-6 py-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Health Assistant
            </h2>
            <HealthChatbot
              userId={user.id}
              healthSummary={healthSummary ?? undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}
