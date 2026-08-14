import { NextResponse } from "next/server";

type ApiFund = {
  id: string;
  nav: number;
  previousNav: number | null;
  navChange: number;
};

type Holding = {
  id: string;
  apiId?: string;
  units: number;
};

type CalculatedFund = Holding & {
  nav: number;
  previousNav: number;
  navChange: number;
  value: number;
  previousValue: number;
  change: number;
};

const holdings: Holding[] = [
  {
    id: "nasdaq100",
    units: 62964,
  },
  {
    id: "sp500",
    units: 174137,
  },
  {
    id: "fang",
    units: 26782,
  },
  {
    id: "india-taxable",
    apiId: "india",
    units: 240650,
  },
  {
    id: "india-nisa-growth",
    apiId: "india",
    units: 209794,
  },
];

// 楽天銀行普通預金
// 今は手動値。後で銀行連携できれば自動化。
const RAKUTEN_BANK_CASH = 252394;

export async function GET(request: Request) {
  try {
    const origin = new URL(request.url).origin;

    const [
      fundResponse,
      usStockResponse,
      jpStockResponse,
      usdAssetResponse,
    ] = await Promise.all([
      fetch(`${origin}/api/rakuten-funds`, {
        cache: "no-store",
      }),

      fetch(`${origin}/api/rakuten-us-stocks`, {
        cache: "no-store",
      }),

      fetch(`${origin}/api/rakuten-jp-stocks`, {
        cache: "no-store",
      }),

      fetch(`${origin}/api/rakuten-usd-assets`, {
        cache: "no-store",
      }),
    ]);

    if (!fundResponse.ok) {
      throw new Error("投資信託データ取得失敗");
    }

    if (!usStockResponse.ok) {
      throw new Error("米国株データ取得失敗");
    }

    if (!jpStockResponse.ok) {
      throw new Error("国内株データ取得失敗");
    }

    if (!usdAssetResponse.ok) {
      throw new Error("米ドル資産データ取得失敗");
    }

    const fundData = await fundResponse.json();
    const usStockData = await usStockResponse.json();
    const jpStockData = await jpStockResponse.json();
    const usdAssetData = await usdAssetResponse.json();

    // ========================================
    // 投資信託
    // ========================================

    const funds: CalculatedFund[] = holdings.map((holding) => {
      const targetId = holding.apiId ?? holding.id;

      const apiFund = fundData.funds.find(
        (fund: ApiFund) => fund.id === targetId
      ) as ApiFund | undefined;

      if (!apiFund) {
        throw new Error(
          `${holding.id}の基準価額がありません`
        );
      }

      const previousNav =
        apiFund.previousNav ?? apiFund.nav;

      const value =
        (holding.units * apiFund.nav) / 10000;

      const previousValue =
        (holding.units * previousNav) / 10000;

      const change =
        value - previousValue;

      return {
        ...holding,
        nav: apiFund.nav,
        previousNav,
        navChange: apiFund.navChange,
        value: Math.round(value),
        previousValue: Math.round(previousValue),
        change: Math.round(change),
      };
    });

    const investmentTrustValue = funds.reduce(
      (sum, fund) => sum + fund.value,
      0
    );

    const investmentTrustChange = funds.reduce(
      (sum, fund) => sum + fund.change,
      0
    );

    // ========================================
    // 米国株
    // ========================================

    const usStockValue =
      Number(usStockData.totalValueJpy) || 0;

    const usStockChange =
      Number(usStockData.totalChangeJpy) || 0;

    // ========================================
    // 国内株
    // ========================================

    const jpStockValue =
      Number(jpStockData.totalValue) || 0;

    const jpStockChange =
      Number(jpStockData.totalChange) || 0;

    // ========================================
    // MMF + 米ドル現金
    // ========================================

    const usdAssetValue =
      Number(usdAssetData.totalValueJpy) || 0;
    const usdAssetChange =
      Number(usdAssetData.totalChangeJpy) || 0;
    // ========================================
    // 楽天証券保有商品合計
    // ========================================

    const holdingsValue =
      investmentTrustValue +
      usStockValue +
      jpStockValue +
      usdAssetValue;

    // 楽天銀行も含む
    const totalRakutenValue =
      holdingsValue + RAKUTEN_BANK_CASH;

    // 現時点：
    // 投信 + 国内株 + 米国株の前日比
    // 為替/MMFは次に追加
    const totalChange =
      investmentTrustChange +
      usStockChange +
      jpStockChange +
      usdAssetChange;
   
    return NextResponse.json({
      updatedAt: new Date().toISOString(),

      holdingsValue,
      rakutenBankCash: RAKUTEN_BANK_CASH,
      totalRakutenValue,

      totalChange,

      breakdown: {
        investmentTrustValue,
        investmentTrustChange,
        jpStockValue,
        jpStockChange,
        usStockValue,
        usStockChange,
        usdAssetValue,
        usdAssetChange,
      },

      usdJpy:
        usdAssetData.usdJpy ??
        usStockData.usdJpy,

      funds,

      jpStocks: jpStockData.stocks,

      usStocks: usStockData.stocks,

      usdAssets: {
        mmf: usdAssetData.mmf,
        usdCash: usdAssetData.usdCash,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "楽天証券評価額を計算できませんでした",
      },
      {
        status: 500,
      }
    );
  }
}