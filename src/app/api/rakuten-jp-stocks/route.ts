import { NextResponse } from "next/server";

type Holding = {
  code: string;
  symbol: string;
  name: string;
  shares: number;
};

const holdings: Holding[] = [
  {
    code: "3048",
    symbol: "3048.T",
    name: "ビックカメラ",
    shares: 100,
  },
  {
    code: "4063",
    symbol: "4063.T",
    name: "信越化学",
    shares: 1,
  },
  {
    code: "5715",
    symbol: "5715.T",
    name: "古河機械金属",
    shares: 1,
  },
  {
    code: "6330",
    symbol: "6330.T",
    name: "東洋エンジニアリング",
    shares: 2,
  },
  {
    code: "7012",
    symbol: "7012.T",
    name: "川崎重工業",
    shares: 200,
  },
  {
    code: "7203",
    symbol: "7203.T",
    name: "トヨタ自動車",
    shares: 200,
  },
  {
    code: "9434",
    symbol: "9434.T",
    name: "ソフトバンク",
    shares: 100,
  },
];

async function getYahooPrice(symbol: string) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/` +
    `${encodeURIComponent(symbol)}?interval=1m&range=1d`;

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `${symbol}の株価取得失敗: ${response.status}`
    );
  }

  const data = await response.json();

  const meta = data?.chart?.result?.[0]?.meta;

  const price =
    meta?.regularMarketPrice ??
    meta?.previousClose ??
    null;

  const previousClose =
    meta?.previousClose ?? null;

  if (price === null) {
    throw new Error(
      `${symbol}の株価を取得できません`
    );
  }

  return {
    price: Number(price),
    previousClose:
      previousClose !== null
        ? Number(previousClose)
        : null,
  };
}

export async function GET() {
  try {
    const stocks = await Promise.all(
      holdings.map(async (holding) => {
        const quote =
          await getYahooPrice(holding.symbol);

        const value =
          quote.price * holding.shares;

        const change =
          quote.previousClose !== null
            ? (quote.price -
                quote.previousClose) *
              holding.shares
            : 0;

        return {
          ...holding,

          price: quote.price,

          previousClose:
            quote.previousClose,

          value: Math.round(value),

          change: Math.round(change),
        };
      })
    );

    const totalValue = stocks.reduce(
      (sum, stock) => sum + stock.value,
      0
    );

    const totalChange = stocks.reduce(
      (sum, stock) => sum + stock.change,
      0
    );

    return NextResponse.json({
      updatedAt: new Date().toISOString(),

      totalValue,
      totalChange,

      stocks,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "国内株式評価額を取得できませんでした",
      },
      {
        status: 500,
      }
    );
  }
}