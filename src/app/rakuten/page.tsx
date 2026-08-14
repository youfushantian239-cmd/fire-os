"use client";

import { useEffect, useMemo, useState } from "react";

type Fund = {
  id: string;
  name: string;
  units: number;
  monthlyAmount: number;
  nav: number;
  navDate?: string;
  autoNav?: boolean;
};

const initialFunds: Fund[] = [
  {
    id: "nasdaq100",
    name: "楽天・プラス・NASDAQ-100",
    units: 62964,
    monthlyAmount: 60000,
    nav: 19260,
  },
  {
    id: "sp500",
    name: "eMAXIS Slim 米国株式(S&P500)",
    units: 174137,
    monthlyAmount: 30000,
    nav: 45727,
  },
  {
    id: "fang",
    name: "iFreeNEXT FANG+",
    units: 26782,
    monthlyAmount: 5000,
    nav: 101036,
  },
  {
   id: "india-taxable",
   name: "iFreeNEXT インド株インデックス（特定口座）",
   units: 240650,
   monthlyAmount: 5000,
   nav: 14273,
 },
 {
   id: "india-nisa-growth",
   name: "iFreeNEXT インド株インデックス（NISA成長投資枠）",
   units: 209794,
   monthlyAmount: 0,
   nav: 14273,
 },
];

const yen = (value: number) =>
  new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);

export default function RakutenPage() {
  const [funds, setFunds] = useState<Fund[]>(initialFunds);
  const [editing, setEditing] = useState(false);
  const [navLoading, setNavLoading] = useState(true);
  const [navError, setNavError] = useState(false);

useEffect(() => {
  const loadData = async () => {
    try {
      // 保存済みの「口数・積立設定」を読み込む
      const saved = localStorage.getItem(
        "fire-navigator-rakuten-funds"
      );

      let baseFunds: Fund[] = initialFunds;

      if (saved) {
        const savedFunds: Fund[] = JSON.parse(saved);

        // 基準価額は保存値を信用せず、
        // 口数と積立額だけ引き継ぐ
        baseFunds = initialFunds.map((initialFund) => {
          const savedFund = savedFunds.find(
            (fund) => fund.id === initialFund.id
          );

          if (!savedFund) return initialFund;

          return {
            ...initialFund,
            units: savedFund.units,
            monthlyAmount: savedFund.monthlyAmount,
          };
        });
      }

      setFunds(baseFunds);

      // 最新基準価額をAPIから取得
      setNavLoading(true);
      setNavError(false);

      const response = await fetch("/api/rakuten-funds", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("基準価額API取得失敗");
      }

      const data = await response.json();

      setFunds((currentFunds) =>
        currentFunds.map((fund) => {
          // NASDAQ100
          if (fund.id === "nasdaq100") {
            const apiFund = data.funds.find(
              (item: { id: string }) =>
                item.id === "nasdaq100"
            );

            if (apiFund) {
              return {
                ...fund,
                nav: apiFund.nav,
                navDate: apiFund.date,
                autoNav: true,
              };
            }
          }

          // S&P500
          if (fund.id === "sp500") {
            const apiFund = data.funds.find(
                (item: { id: string }) => item.id === "sp500"
            );

          if (apiFund) {
            return {
              ...fund,
              nav: apiFund.nav,
              navDate: apiFund.date,
              autoNav: true,
            };
          }
        }
          // FANG+
          if (fund.id === "fang") {
            const apiFund = data.funds.find(
              (item: { id: string }) => item.id === "fang"
            );

            if (apiFund) {
              return {
                ...fund,
                nav: apiFund.nav,
                navDate: apiFund.date,
                autoNav: true,
              };
            }
          }

          // インド株は2口座とも同じ基準価額を使う
          if (
            fund.id === "india-taxable" ||
            fund.id === "india-nisa-growth"
          ) {
            const apiFund = data.funds.find(
              (item: { id: string }) => item.id === "india"
            );

            if (apiFund) {
              return {
                ...fund,
                nav: apiFund.nav,
                navDate: apiFund.date,
                autoNav: true,
              };
            }
          }

          // S&P500は今の固定値を維持
          return {
            ...fund,
            autoNav: false,
          };
        })
      );
    } catch (error) {
      console.error(error);
      setNavError(true);
    } finally {
      setNavLoading(false);
    }
  };

  loadData();
}, []);

  const totalValue = useMemo(
    () =>
      funds.reduce(
        (sum, fund) => sum + (fund.units * fund.nav) / 10000,
        0
      ),
    [funds]
  );

  const totalMonthlyAmount = useMemo(
    () => funds.reduce((sum, fund) => sum + fund.monthlyAmount, 0),
    [funds]
  );

  const updateFund = (
    id: string,
    field: "units" | "monthlyAmount",
    value: number
  ) => {
    setFunds((current) =>
      current.map((fund) =>
        fund.id === id ? { ...fund, [field]: value } : fund
      )
    );
  };

  const saveFunds = () => {
    localStorage.setItem(
      "fire-navigator-rakuten-funds",
      JSON.stringify(funds)
    );

    setEditing(false);
  };

  return (
    <main className="min-h-screen bg-[#0b0d0f] text-white">
      <div className="mx-auto max-w-md px-5 pb-24 pt-7">

        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.25em] text-zinc-500">
              FIRE NAVIGATOR
            </p>
            <h1 className="mt-2 text-xl font-medium">楽天証券</h1>
          </div>

          <button
            onClick={() => setEditing(!editing)}
            className="rounded-full bg-zinc-900 px-4 py-2 text-xs text-zinc-300"
          >
            {editing ? "閉じる" : "編集"}
          </button>
        </header>

        <section className="mb-8">
          <p className="text-sm text-zinc-500">投資信託評価額</p>
          <p className="mt-2 text-4xl font-light">
            {yen(totalValue)}
          </p>

          <p className="mt-3 text-sm text-zinc-500">
            毎月積立 {yen(totalMonthlyAmount)}
          </p>
        </section>

        {editing && (
          <section className="mb-8 rounded-3xl border border-white/10 bg-[#14171a] p-5">
            <h2 className="mb-5 font-medium">積立設定・保有口数</h2>

            <div className="space-y-6">
              {funds.map((fund) => (
                <div key={fund.id}>
                  <p className="mb-3 text-sm">{fund.name}</p>

                  <label className="block">
                    <span className="mb-2 block text-xs text-zinc-500">
                      保有口数
                    </span>

                    <input
                      type="number"
                      value={fund.units}
                      onChange={(event) =>
                        updateFund(
                          fund.id,
                          "units",
                          Number(event.target.value)
                        )
                      }
                      className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
                    />
                  </label>

                  <label className="mt-3 block">
                    <span className="mb-2 block text-xs text-zinc-500">
                      毎月積立額
                    </span>

                    <input
                      type="number"
                      value={fund.monthlyAmount}
                      onChange={(event) =>
                        updateFund(
                          fund.id,
                          "monthlyAmount",
                          Number(event.target.value)
                        )
                      }
                      className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
                    />
                  </label>
                </div>
              ))}
            </div>

            <button
              onClick={saveFunds}
              className="mt-6 w-full rounded-2xl bg-white py-3 text-sm font-semibold text-black"
            >
              保存する
            </button>
          </section>
        )}

        <section className="overflow-hidden rounded-3xl border border-white/5 bg-[#14171a]">
          {funds.map((fund, index) => {
            const value = (fund.units * fund.nav) / 10000;

            return (
              <div
                key={fund.id}
                className={`px-5 py-5 ${
                  index !== funds.length - 1
                    ? "border-b border-white/5"
                    : ""
                }`}
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="text-sm">{fund.name}</p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {fund.units.toLocaleString()}口
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      基準価額 {yen(fund.nav)}
                     {fund.navDate === "sp500" ? " ◯ 手動" : " ● 自動"}
                    </p>

                    {fund.navDate && (
                      <p className="mt-1 text-[10px] text-zinc-700">
                       {fund.navDate} 更新
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-sm">{yen(value)}</p>

                    <p className="mt-1 text-xs text-zinc-500">
                      毎月 {yen(fund.monthlyAmount)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}