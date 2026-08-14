import { NextResponse } from "next/server";

const holdings = [
  {
    symbol: "NVDA",
    name: "NVIDIA",
    shares: 5,
  },
  {
    symbol: "RKLB",
    name: "Rocket Lab",
    shares: 7,
  },
  {
    symbol: "PL",
    name: "Planet Labs",
    shares: 5,
  },
  {
    symbol: "GOOGL",
    name: "Alphabet",
    shares: 5,
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
      `${symbol}の価格取得失敗: ${response.status}`
    );
  }

  const data = await response.json();

  const meta = data?.chart?.result?.[0]?.meta;

  const price =
    meta?.regularMarketPrice ??
    meta?.previousClose ??
    null;

  if (price === null) {
    throw new Error(
      `${symbol}の価格が見つかりません`
    );
  }

  return {
    price: Number(price),
    previousClose:
      meta?.previousClose !== undefined
        ? Number(meta.previousClose)
        : null,
  };
}

async function getUsdJpy() {
  const result = await getYahooPrice("JPY=X");

  return result.price;
}

export async function GET() {
  try {
    const usdJpy = await getUsdJpy();

    const stocks = await Promise.all(
      holdings.map(async (holding) => {
        const quote =
          await getYahooPrice(holding.symbol);

        const valueUsd =
          holding.shares * quote.price;

        const valueJpy =
          valueUsd * usdJpy;

        const changeUsd =
          quote.previousClose !== null
            ? holding.shares *
              (quote.price - quote.previousClose)
            : 0;

        const changeJpy =
          changeUsd * usdJpy;

        return {
          ...holding,
          priceUsd: quote.price,
          previousCloseUsd: quote.previousClose,
          valueUsd,
          valueJpy: Math.round(valueJpy),
          changeJpy: Math.round(changeJpy),
        };
      })
    );

    const totalValueJpy = stocks.reduce(
      (sum, stock) => sum + stock.valueJpy,
      0
    );

    const totalChangeJpy = stocks.reduce(
      (sum, stock) => sum + stock.changeJpy,
      0
    );

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      usdJpy,
      totalValueJpy,
      totalChangeJpy,
      stocks,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "米国株評価額を取得できませんでした",
      },
      {
        status: 500,
      }
    );
  }
}