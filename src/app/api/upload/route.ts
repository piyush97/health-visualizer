import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Increase the maximum file size for uploads
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".xml")) {
      return NextResponse.json(
        { error: "Only XML files are supported" },
        { status: 400 }
      );
    }

    // Check file size (warn if > 100MB)
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB limit
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5GB." },
        { status: 413 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const fileId = uuidv4();
    const fileName = `${fileId}.xml`;
    const filePath = path.join(uploadsDir, fileName);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    return NextResponse.json({
      success: true,
      fileId,
      fileName: file.name,
      size: file.size,
      message: "File uploaded successfully"
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
