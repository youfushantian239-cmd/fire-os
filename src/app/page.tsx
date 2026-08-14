"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Asset = {
  id: string;
  name: string;
  value: number;
  change: number;
};

type TelPriceResponse = {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  previousClose: number | null;
  updatedAt: string;
};

const initialAssets: Asset[] = [
  { id: "rakuten", name: "楽天証券", value: 0, change: 0 },
  { id: "moomoo", name: "moomoo証券", value: 0, change: 0 },
  { id: "cash", name: "現金", value: 280000, change: 0 },
];

const INITIAL_TEL_SHARES = 36;

const yen = (value: number) =>
  new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);

export default function Home() {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [editing, setEditing] = useState(false);

  const [moomooValue, setMoomooValue] = useState(0);
  const [moomooChange, setMoomooChange] = useState(0);
  const [moomooLoading, setMoomooLoading] = useState(true);
  const [moomooError, setMoomooError] = useState(false);

  const [rakutenValue, setRakutenValue] = useState(0);
  const [rakutenChange, setRakutenChange] = useState(0);
  const [rakutenLoading, setRakutenLoading] = useState(true);
  const [rakutenError, setRakutenError] = useState(false);

  const [telShares, setTelShares] = useState(INITIAL_TEL_SHARES);
  const [telPrice, setTelPrice] = useState<number | null>(null);
  const [telPreviousClose, setTelPreviousClose] = useState<number | null>(null);
  const [telUpdatedAt, setTelUpdatedAt] = useState<string | null>(null);
  const [telLoading, setTelLoading] = useState(true);
  const [telError, setTelError] = useState(false);

useEffect(() => {
  const fetchMoomooPortfolio = async () => {
    try {
      setMoomooLoading(true);
      setMoomooError(false);

      const response = await fetch("/api/moomoo-portfolio", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("moomoo証券データの取得に失敗");
      }

      const data = await response.json();

      setMoomooValue(Number(data.totalValueJpy) || 0);
      setMoomooChange(Number(data.totalChangeJpy) || 0);
    } catch (error) {
      console.error(error);
      setMoomooError(true);
    } finally {
      setMoomooLoading(false);
    }
  };

  fetchMoomooPortfolio();

  const timer = setInterval(
    fetchMoomooPortfolio,
    5 * 60 * 1000
  );

  return () => clearInterval(timer);
}, []);  

useEffect(() => {
  const fetchRakutenPortfolio = async () => {
    try {
      setRakutenLoading(true);
      setRakutenError(false);

      const response = await fetch("/api/rakuten-portfolio", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("楽天証券データの取得に失敗");
      }

      const data = await response.json();

      setRakutenValue(Number(data.totalRakutenValue) || 0);
      setRakutenChange(Number(data.totalChange) || 0);
    } catch (error) {
      console.error(error);
      setRakutenError(true);
    } finally {
      setRakutenLoading(false);
    }
  };

  fetchRakutenPortfolio();

  const timer = setInterval(
    fetchRakutenPortfolio,
    5 * 60 * 1000
  );

  return () => clearInterval(timer);
}, []);

  useEffect(() => {
    const savedAssets = localStorage.getItem("fire-navigator-assets");
    const savedTelShares = localStorage.getItem("fire-navigator-tel-shares");

    if (savedAssets) {
      const parsedAssets: Asset[] = JSON.parse(savedAssets);
      setAssets(
        parsedAssets.filter((asset) => asset.id !== "tel")
      );
    }

    if (savedTelShares) {
      setTelShares(Number(savedTelShares));
    }
  }, []);

  useEffect(() => {
    const fetchTelPrice = async () => {
      try {
        setTelLoading(true);
        setTelError(false);

        const response = await fetch("/api/tel-price", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("TEL price fetch failed");
        }

        const data: TelPriceResponse = await response.json();

        setTelPrice(data.price);
        setTelPreviousClose(data.previousClose);
        setTelUpdatedAt(data.updatedAt);
      } catch (error) {
        console.error(error);
        setTelError(true);
      } finally {
        setTelLoading(false);
      }
    };

    fetchTelPrice();

    const timer = setInterval(fetchTelPrice, 5 * 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  const telValue =
  telPrice !== null
    ? Number(telShares) * Number(telPrice)
    : 0;

const telChange =
  telPrice !== null && telPreviousClose !== null
    ? Number(telShares) *
      (Number(telPrice) - Number(telPreviousClose))
    : 0;

const allAssets: Asset[] = [
  ...assets.map((asset) => {
    if (asset.id === "rakuten") {
      return {
        ...asset,
        value: rakutenValue,
        change: rakutenChange,
      };
    }

    if (asset.id === "moomoo") {
      return {
        ...asset,
        value: moomooValue,
        change: moomooChange,
      };
    }

    return asset;
  }),

  {
    id: "tel",
    name: "TEL 持株",
    value: telValue,
    change: telChange,
  },
];
  const totalAssets = useMemo(
    () => allAssets.reduce((sum, asset) => sum + asset.value, 0),
    [allAssets]
  );

  const todayChange = useMemo(
    () => allAssets.reduce((sum, asset) => sum + asset.change, 0),
    [allAssets]
  );

  const telRatio =
    totalAssets > 0 ? (telValue / totalAssets) * 100 : 0;

  const telTargetValue = totalAssets * 0.2;

  const telSuggestedSellAmount =
    telRatio > 20 ? telValue - telTargetValue : 0;

  const updateValue = (id: string, value: number) => {
    setAssets((current) =>
      current.map((asset) =>
        asset.id === id ? { ...asset, value } : asset
      )
    );
  };

  const saveAssets = () => {
    localStorage.setItem(
      "fire-navigator-assets",
      JSON.stringify(assets)
    );

    localStorage.setItem(
      "fire-navigator-tel-shares",
      String(telShares)
    );

    setEditing(false);
  };

  const aiMessage =
    telRatio > 20
      ? {
          title: "TEL持株比率を確認してください",
          text: `TEL比率は${telRatio.toFixed(
            1
          )}%です。設定した20%上限を超えています。目安として約${yen(
            telSuggestedSellAmount
          )}分のリバランスを検討できます。`,
        }
      : {
          title: "現在の資産配分を維持",
          text: `TEL比率は${telRatio.toFixed(
            1
          )}%です。20%ルールの範囲内なので、現時点ではTEL売却を急ぐ必要はありません。`,
        };

  return (
    <main className="min-h-screen bg-[#0b0d0f] text-white">
      <div className="mx-auto max-w-md px-5 pb-28 pt-7">

        <header className="mb-9 flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.28em] text-zinc-500">
              FIRE NAVIGATOR
            </p>
            <h1 className="mt-2 text-lg font-medium">
              ポートフォリオ
            </h1>
          </div>

          <button
            onClick={() => setEditing(!editing)}
            className="rounded-full bg-zinc-900 px-4 py-2 text-xs text-zinc-300"
          >
            {editing ? "閉じる" : "編集"}
          </button>
        </header>

        <section className="mb-9">
          <p className="text-sm text-zinc-500">総資産</p>

          <p className="mt-2 text-4xl font-light tracking-tight">
            {yen(totalAssets)}
          </p>

          <div className="mt-3 flex items-center gap-3 text-sm">
            <span
              className={
                todayChange >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }
            >
              {todayChange >= 0 ? "+" : ""}
              {yen(todayChange)}
            </span>

            <span className="text-zinc-600">前日比</span>
          </div>
        </section>

        {editing && (
          <section className="mb-8 rounded-3xl border border-white/10 bg-[#14171a] p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-medium">資産を入力</h2>
              <span className="text-xs text-zinc-500">
                TELは株数のみ
              </span>
            </div>

            <div className="space-y-4">
              {assets
                .filter(
                  (asset) =>
                    asset.id !== "rakuten" &&
                    asset.id !== "moomoo"
                )
                .map((asset) => (
                <label key={asset.id} className="block">
                  <span className="mb-2 block text-xs text-zinc-500">
                    {asset.name}
                  </span>

                  <input
                    type="number"
                    value={asset.value}
                    onChange={(event) =>
                      updateValue(
                        asset.id,
                        Number(event.target.value)
                      )
                    }
                    className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/30"
                  />
                </label>
              ))}

              <label className="block">
                <span className="mb-2 block text-xs text-zinc-500">
                  TEL保有株数
                </span>

                <input
                  type="number"
                  step="0.001"
                  value={telShares}
                  onChange={(event) =>
                    setTelShares(Number(event.target.value))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/30"
                />
              </label>

              <div className="rounded-2xl bg-black/40 p-4">
                <p className="text-xs text-zinc-500">
                  TEL最新株価
                </p>

                <p className="mt-2 text-lg">
                  {telLoading
                    ? "取得中..."
                    : telError
                    ? "取得エラー"
                    : telPrice
                    ? yen(telPrice)
                    : "-"}
                </p>

                {telUpdatedAt && (
                  <p className="mt-1 text-xs text-zinc-600">
                    更新：
                    {new Date(telUpdatedAt).toLocaleString("ja-JP")}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={saveAssets}
              className="mt-5 w-full rounded-2xl bg-white py-3 text-sm font-semibold text-black"
            >
              保存する
            </button>
          </section>
        )}

        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium">資産内訳</h2>
            <span className="text-xs text-zinc-500">
              評価額
            </span>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#14171a]">
            {allAssets.map((asset, index) => {
              const ratio =
                totalAssets > 0
                  ? (asset.value / totalAssets) * 100
                  : 0;

              const isTel = asset.id === "tel";

              return (
                <Link
                  key={asset.id}
                  href={asset.id === "rakuten" ? "/rakuten" : "#"}
                  className={`flex items-center justify-between px-5 py-4 ${
                    index !== allAssets.length - 1
                      ? "border-b border-white/5"
                      : ""
                  }`}
                >
                  <div>
                    <p className="text-sm">{asset.name}</p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {ratio.toFixed(1)}%
                    </p>

                    {isTel && telPrice && (
                      <p className="mt-1 text-xs text-zinc-600">
                        {telShares}株 × {yen(telPrice)}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-sm">{yen(asset.value)}</p>

                    <p
                      className={`mt-1 text-xs ${
                        asset.change > 0
                          ? "text-emerald-400"
                          : asset.change < 0
                          ? "text-red-400"
                          : "text-zinc-500"
                      }`}
                    >
                      {asset.change > 0 ? "+" : ""}
                      {yen(asset.change)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mb-5 rounded-3xl border border-white/5 bg-[#14171a] p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs tracking-[0.2em] text-zinc-500">
              AI TODAY
            </p>

            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>

          <h2 className="text-lg font-medium">
            {aiMessage.title}
          </h2>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {aiMessage.text}
          </p>

          <div className="mt-5 border-t border-white/5 pt-4">
            <p className="text-xs text-zinc-600">WHY?</p>

            <p className="mt-2 text-sm text-zinc-300">
              TEL持株の最新評価額と、設定した総資産20%ルールを基準に判断しています。
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 text-black">
          <p className="text-xs tracking-[0.2em] text-zinc-500">
            TODAY
          </p>

          <h2 className="mt-3 text-xl font-semibold">
            今日やるべきこと
          </h2>

          <div className="mt-5 space-y-4">
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs text-white">
                1
              </span>

              <div>
                <p className="text-sm font-medium">
                  {telRatio > 20
                    ? "TEL持株のリバランス額を確認"
                    : "TEL持株は継続保有"}
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  現在のTEL比率は
                  {telRatio.toFixed(1)}%です
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs">
                2
              </span>

              <div>
                <p className="text-sm font-medium">
                  NISA積立は継続
                </p>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  長期投資方針に変更がないため
                </p>
              </div>
            </div>
          </div>
        </section>

        <nav className="fixed bottom-4 left-1/2 flex w-[calc(100%-32px)] max-w-md -translate-x-1/2 items-center justify-around rounded-3xl border border-white/10 bg-black/90 px-3 py-4 backdrop-blur-xl">
          <button className="text-xs text-white">ホーム</button>
          <button className="text-xs text-zinc-600">資産</button>
          <button className="text-xs text-zinc-600">AI</button>
          <button className="text-xs text-zinc-600">予測</button>
          <button className="text-xs text-zinc-600">設定</button>
        </nav>
      </div>
    </main>
  );
}