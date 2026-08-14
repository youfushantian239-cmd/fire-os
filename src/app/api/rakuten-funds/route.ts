import { NextResponse } from "next/server";

type FundResult = {
  id: string;
  name: string;
  date: string;
  nav: number;
  previousDate: string | null;
  previousNav: number | null;
  navChange: number;
  source: string;
  ok: boolean;
};

// 20260814 → 2026/08/14
function formatDate(date: string) {
  return `${date.slice(0, 4)}/${date.slice(4, 6)}/${date.slice(6, 8)}`;
}

// 2026/8/14 → 2026/08/14
function normalizeSlashDate(date: string) {
  const [year, month, day] = date.split("/");

  return `${year}/${month.padStart(2, "0")}/${day.padStart(2, "0")}`;
}

// ========================================
// 楽天・プラス・NASDAQ-100
// ========================================

async function getRakutenNasdaq100(): Promise<FundResult> {
  const url =
    "https://www.rakuten-toushin.co.jp/assets/csv/chart_100091.csv";

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `楽天NASDAQ100取得失敗: ${response.status}`
    );
  }

  const buffer = await response.arrayBuffer();
  const text = new TextDecoder("shift_jis").decode(buffer);

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const dataLines = lines.filter((line) =>
    /^\d{4}\/\d{2}\/\d{2},/.test(line)
  );

  if (dataLines.length === 0) {
    throw new Error(
      "楽天NASDAQ100のデータが見つかりません"
    );
  }

  const latest = dataLines[dataLines.length - 1];
  const previous =
    dataLines.length >= 2
      ? dataLines[dataLines.length - 2]
      : null;

  const latestColumns = latest.split(",");
  const previousColumns = previous
    ? previous.split(",")
    : null;

  const date =
    latestColumns[0].replace(/"/g, "");

  const nav = Number(
    latestColumns[1]
      .replace(/"/g, "")
      .replace(/,/g, "")
  );

  const previousDate = previousColumns
    ? previousColumns[0].replace(/"/g, "")
    : null;

  const previousNav = previousColumns
    ? Number(
        previousColumns[1]
          .replace(/"/g, "")
          .replace(/,/g, "")
      )
    : null;

  if (!Number.isFinite(nav)) {
    throw new Error(
      "楽天NASDAQ100の基準価額を取得できません"
    );
  }

  return {
    id: "nasdaq100",
    name: "楽天・プラス・NASDAQ-100",
    date,
    nav,
    previousDate,
    previousNav,
    navChange:
      previousNav !== null
        ? nav - previousNav
        : 0,
    source: "楽天投信投資顧問",
    ok: true,
  };
}

// ========================================
// eMAXIS Slim 米国株式（S&P500）
// ========================================

async function getSp500(): Promise<FundResult> {
  const url =
    "https://www.am.mufg.jp/fund_file/setteirai/253266.csv";

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `S&P500取得失敗: ${response.status}`
    );
  }

  const buffer = await response.arrayBuffer();
  const text = new TextDecoder("shift_jis").decode(buffer);

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const dataLines = lines.filter((line) =>
    /^\d{4}\/\d{1,2}\/\d{1,2},/.test(line)
  );

  if (dataLines.length === 0) {
    throw new Error(
      "S&P500の時系列データが見つかりません"
    );
  }

  const latest = dataLines[dataLines.length - 1];
  const previous =
    dataLines.length >= 2
      ? dataLines[dataLines.length - 2]
      : null;

  const latestColumns = latest.split(",");
  const previousColumns = previous
    ? previous.split(",")
    : null;

  const rawDate =
    latestColumns[0].replace(/"/g, "").trim();

  const nav = Number(
    latestColumns[1]
      .replace(/"/g, "")
      .replace(/,/g, "")
      .trim()
  );

  const previousRawDate = previousColumns
    ? previousColumns[0]
        .replace(/"/g, "")
        .trim()
    : null;

  const previousNav = previousColumns
    ? Number(
        previousColumns[1]
          .replace(/"/g, "")
          .replace(/,/g, "")
          .trim()
      )
    : null;

  if (!Number.isFinite(nav)) {
    throw new Error(
      "S&P500の基準価額を取得できません"
    );
  }

  return {
    id: "sp500",
    name: "eMAXIS Slim 米国株式(S&P500)",
    date: normalizeSlashDate(rawDate),
    nav,
    previousDate: previousRawDate
      ? normalizeSlashDate(previousRawDate)
      : null,
    previousNav,
    navChange:
      previousNav !== null
        ? nav - previousNav
        : 0,
    source: "三菱UFJアセットマネジメント",
    ok: true,
  };
}

// ========================================
// 大和アセット
// FANG+ / インド株
// ========================================

async function getDaiwaFund(
  id: string,
  name: string,
  code: string
): Promise<FundResult> {
  const url =
    `https://www.daiwa-am.co.jp/funds/detail/csv_out.php?code=${code}&type=1`;

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `${name}取得失敗: ${response.status}`
    );
  }

  const buffer = await response.arrayBuffer();
  const text =
    new TextDecoder("shift_jis").decode(buffer);

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const dataLines = lines.filter((line) => {
    const firstColumn = line.split(",")[0];
    return /^\d{8}$/.test(firstColumn);
  });

  if (dataLines.length === 0) {
    throw new Error(
      `${name}の時系列データが見つかりません`
    );
  }

  const latest =
    dataLines[dataLines.length - 1];

  const previous =
    dataLines.length >= 2
      ? dataLines[dataLines.length - 2]
      : null;

  const latestColumns = latest.split(",");
  const previousColumns = previous
    ? previous.split(",")
    : null;

  const rawDate = latestColumns[0];
  const nav = Number(latestColumns[1]);

  const previousRawDate = previousColumns
    ? previousColumns[0]
    : null;

  const previousNav = previousColumns
    ? Number(previousColumns[1])
    : null;

  if (!Number.isFinite(nav)) {
    throw new Error(
      `${name}の基準価額を取得できません`
    );
  }

  return {
    id,
    name,
    date: formatDate(rawDate),
    nav: Math.round(nav),
    previousDate: previousRawDate
      ? formatDate(previousRawDate)
      : null,
    previousNav:
      previousNav !== null
        ? Math.round(previousNav)
        : null,
    navChange:
      previousNav !== null
        ? Math.round(nav - previousNav)
        : 0,
    source: "大和アセットマネジメント",
    ok: true,
  };
}

// ========================================
// API
// ========================================

export async function GET() {
  try {
    const [nasdaq100, sp500, fang, india] =
      await Promise.all([
        getRakutenNasdaq100(),

        getSp500(),

        getDaiwaFund(
          "fang",
          "iFreeNEXT FANG+インデックス",
          "3346"
        ),

        getDaiwaFund(
          "india",
          "iFreeNEXT インド株インデックス",
          "3484"
        ),
      ]);

    return NextResponse.json({
      updatedAt: new Date().toISOString(),

      funds: [
        nasdaq100,
        sp500,
        fang,
        india,
      ],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "基準価額を取得できませんでした",
      },
      {
        status: 500,
      }
    );
  }
}