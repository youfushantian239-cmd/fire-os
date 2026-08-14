import { NextResponse } from "next/server";

type Holding = {
  symbol: string;
  name: string;
  shares: number;
};

const holdings: Holding[] = [
  {
    symbol: "GOOG",
    name: "Alphabet Class C",
    shares: 0.0149,
  },
  {
    symbol: "SPCX",
    name: "SPCX",
    shares: 0.0652,
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Class A",
    shares: 2,
  },
  {
    symbol: "RDW",
    name: "Redwire",
    shares: 50,
  },
  {
    symbol: "RKLB",
    name: "Rocket Lab",
    shares: 29,
  },
];

// moomoo預り金
const JPY_CASH = 480383;
const USD_CASH = 1068.39;

async function getYahooChart(symbol: string) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?interval=1m&range=1d`;

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `${symbol}取得失敗: ${response.status}`
    );
  }

  const data = await response.json();

  const meta =
    data?.chart?.result?.[0]?.meta;

  const price =
    meta?.regularMarketPrice ?? null;

  const previousClose =
    meta?.previousClose ?? null;

  if (
    price === null ||
    previousClose === null
  ) {
    throw new Error(
      `${symbol}の株価を取得できません`
    );
  }

  return {
    price: Number(price),
    previousClose: Number(previousClose),
  };
}

async function getUsdJpy() {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/JPY=X?interval=1m&range=1d";

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `USDJPY取得失敗: ${response.status}`
    );
  }

  const data = await response.json();

  const meta =
    data?.chart?.result?.[0]?.meta;

  const current =
    meta?.regularMarketPrice ??
    meta?.previousClose ??
    null;

  const previousClose =
    meta?.previousClose ?? null;

  if (
    current === null ||
    previousClose === null
  ) {
    throw new Error(
      "USDJPYを取得できません"
    );
  }

  return {
    current: Number(current),
    previousClose: Number(previousClose),
  };
}

export async function GET() {
  try {
    const [fx, ...quotes] =
      await Promise.all([
        getUsdJpy(),
        ...holdings.map((holding) =>
          getYahooChart(holding.symbol)
        ),
      ]);

    const stocks = holdings.map(
      (holding, index) => {
        const quote = quotes[index];

        const valueUsd =
          holding.shares * quote.price;

        const valueJpy =
          valueUsd * fx.current;

        // 前日終値時点の円換算評価額
        const previousValueUsd =
          holding.shares *
          quote.previousClose;

        const previousValueJpy =
          previousValueUsd *
          fx.previousClose;

        const changeJpy =
          valueJpy - previousValueJpy;

        return {
          ...holding,

          priceUsd: quote.price,
          previousCloseUsd:
            quote.previousClose,

          valueUsd,
          valueJpy:
            Math.round(valueJpy),

          previousValueJpy:
            Math.round(previousValueJpy),

          changeJpy:
            Math.round(changeJpy),
        };
      }
    );

    // ========================================
    // 株式
    // ========================================

    const stockValueJpy =
      stocks.reduce(
        (sum, stock) =>
          sum + stock.valueJpy,
        0
      );

    const stockChangeJpy =
      stocks.reduce(
        (sum, stock) =>
          sum + stock.changeJpy,
        0
      );

    // ========================================
    // USD現金
    // ========================================

    const usdCashValueJpy =
      USD_CASH * fx.current;

    const usdCashPreviousValueJpy =
      USD_CASH * fx.previousClose;

    const usdCashChangeJpy =
      usdCashValueJpy -
      usdCashPreviousValueJpy;

    // ========================================
    // moomoo総資産
    // ========================================

    const totalValueJpy =
      stockValueJpy +
      JPY_CASH +
      usdCashValueJpy;

    const totalChangeJpy =
      stockChangeJpy +
      usdCashChangeJpy;

    return NextResponse.json({
      updatedAt:
        new Date().toISOString(),

      usdJpy: fx.current,
      previousUsdJpy:
        fx.previousClose,

      totalValueJpy:
        Math.round(totalValueJpy),

      totalChangeJpy:
        Math.round(totalChangeJpy),

      breakdown: {
        stockValueJpy,
        stockChangeJpy,

        jpyCash: JPY_CASH,

        usdCash: USD_CASH,

        usdCashValueJpy:
          Math.round(usdCashValueJpy),

        usdCashChangeJpy:
          Math.round(
            usdCashChangeJpy
          ),
      },

      stocks,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "moomoo資産を取得できませんでした",
      },
      {
        status: 500,
      }
    );
  }
}