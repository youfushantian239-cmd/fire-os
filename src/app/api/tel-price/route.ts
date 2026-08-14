import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url =
      "https://query1.finance.yahoo.com/v8/finance/chart/8035.T?interval=1m&range=1d";

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch TEL price");
    }

    const data = await response.json();

    const result = data?.chart?.result?.[0];
    const meta = result?.meta;

    const price =
      meta?.regularMarketPrice ??
      meta?.previousClose ??
      null;

    if (price === null) {
      throw new Error("TEL price was not found");
    }

    return NextResponse.json({
      symbol: "8035.T",
      name: "東京エレクトロン",
      price,
      currency: meta?.currency ?? "JPY",
      marketState: meta?.marketState ?? null,
      previousClose: meta?.previousClose ?? null,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "TEL株価を取得できませんでした" },
      { status: 500 }
    );
  }
}