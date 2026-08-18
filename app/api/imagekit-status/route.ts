import {
  extractImageKitErrorMessage,
  getFriendlyImageKitError,
} from "@/lib/imagekit-errors";
import { NextResponse } from "next/server";

function isAllowedImageKitUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "ik.imagekit.io";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { url } = (await request.json()) as { url?: string };

    if (!url || !isAllowedImageKitUrl(url)) {
      return NextResponse.json(
        { status: "failed", message: "Invalid image URL" },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "image/*,application/json,text/plain" },
      });

      const contentType = response.headers.get("content-type") || "";
      const intermediate =
        response.headers.get("is-intermediate-response") === "true";

      if (response.ok && (intermediate || contentType.includes("text/html"))) {
        await response.body?.cancel();
        return NextResponse.json({ status: "pending" });
      }

      if (response.ok && contentType.startsWith("image/")) {
        await response.body?.cancel();
        return NextResponse.json({ status: "ready" });
      }

      if (response.status >= 400) {
        const body = await response.text();
        const rawMessage = extractImageKitErrorMessage(body);
        return NextResponse.json({
          status: "failed",
          httpStatus: response.status,
          message: getFriendlyImageKitError(rawMessage, response.status),
        });
      }

      await response.body?.cancel();
      return NextResponse.json({ status: "pending" });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ status: "pending" });
    }

    console.error("ImageKit status probe failed:", error);
    return NextResponse.json({ status: "pending" });
  }
}
