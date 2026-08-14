import { NextResponse } from "next/server";

const MMF_UNITS = 626913;
const USD_CASH = 544.93;

// 楽天・米ドルMMFは通常1口 = 0.01 USD
const MMF_USD_PER_UNIT = 0.01;

type FxQuote = {
  current: number;
  previousClose: number;
};

async function getUsdJpy(): Promise<FxQuote> {
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
    meta?.previousClose ??
    null;

  if (
    current === null ||
    previousClose === null
  ) {
    throw new Error(
      "USDJPYの現在値または前日終値を取得できません"
    );
  }

  return {
    current: Number(current),
    previousClose: Number(previousClose),
  };
}

export async function GET() {
  try {
    const fx = await getUsdJpy();

    // ========================================
    // MMF
    // ========================================

    const mmfValueUsd =
      MMF_UNITS * MMF_USD_PER_UNIT;

    const mmfValueJpy =
      mmfValueUsd * fx.current;

    const mmfPreviousValueJpy =
      mmfValueUsd * fx.previousClose;

    const mmfChangeJpy =
      mmfValueJpy - mmfPreviousValueJpy;

    // ========================================
    // 米ドル現金
    // ========================================

    const usdCashValueJpy =
      USD_CASH * fx.current;

    const usdCashPreviousValueJpy =
      USD_CASH * fx.previousClose;

    const usdCashChangeJpy =
      usdCashValueJpy -
      usdCashPreviousValueJpy;

    // ========================================
    // 合計
    // ========================================

    const totalValueJpy =
      mmfValueJpy + usdCashValueJpy;

    const totalPreviousValueJpy =
      mmfPreviousValueJpy +
      usdCashPreviousValueJpy;

    const totalChangeJpy =
      totalValueJpy -
      totalPreviousValueJpy;

    return NextResponse.json({
      updatedAt: new Date().toISOString(),

      usdJpy: fx.current,
      previousUsdJpy: fx.previousClose,
      usdJpyChange:
        fx.current - fx.previousClose,

      mmf: {
        units: MMF_UNITS,
        usdPerUnit: MMF_USD_PER_UNIT,
        valueUsd: mmfValueUsd,
        valueJpy: Math.round(mmfValueJpy),
        previousValueJpy:
          Math.round(mmfPreviousValueJpy),
        changeJpy:
          Math.round(mmfChangeJpy),
      },

      usdCash: {
        amountUsd: USD_CASH,
        valueJpy:
          Math.round(usdCashValueJpy),
        previousValueJpy:
          Math.round(
            usdCashPreviousValueJpy
          ),
        changeJpy:
          Math.round(
            usdCashChangeJpy
          ),
      },

      totalValueJpy:
        Math.round(totalValueJpy),

      totalPreviousValueJpy:
        Math.round(
          totalPreviousValueJpy
        ),

      totalChangeJpy:
        Math.round(totalChangeJpy),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "米ドル資産を取得できませんでした",
      },
      {
        status: 500,
      }
    );
  }
}