import { EventType } from "@/lib/analytics/types";
import useWorkspace from "@/lib/swr/use-workspace";
import { buttonVariants, useRouterStuff } from "@dub/ui";
import { cn } from "@dub/utils";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { Coins, Lock } from "lucide-react";
import Link from "next/link";
import { useContext, useMemo } from "react";
import AnalyticsAreaChart from "./analytics-area-chart";
import { AnalyticsFunnelChart } from "./analytics-funnel-chart";
import { AnalyticsContext } from "./analytics-provider";

type Tab = {
  id: EventType;
  label: string;
  colorClassName: string;
  conversions: boolean;
};

export default function Main() {
  const {
    totalEvents,
    requiresUpgrade,
    showConversions,
    selectedTab,
    saleUnit,
    view,
  } = useContext(AnalyticsContext);
  const { plan } = useWorkspace();
  const { queryParams } = useRouterStuff();

  const tabs = useMemo(
    () =>
      [
        {
          id: "clicks",
          label: "Clicks",
          colorClassName: "text-[#08272E]/50",
          conversions: false,
        },
        ...(showConversions
          ? [
              {
                id: "leads",
                label: "Conversions",
                colorClassName: "text-[#08272E]/50",
                conversions: true,
              },
              {
                id: "sales",
                label: "Sales",
                colorClassName: "text-[#08272E]/50",
                conversions: true,
              },
            ]
          : []),
      ] as Tab[],
    [showConversions],
  );

  const tab = tabs.find(({ id }) => id === selectedTab) ?? tabs[0];

  const showPaywall =
    (tab.id === "sales" || view === "funnel") && plan === "free";

  return (
    <div className="w-full overflow-hidden bg-white">
      <div className="scrollbar-hide grid w-full grid-cols-3 divide-x overflow-y-hidden rounded-t-xl border-[6px] border-b-2 border-neutral-100">
        <NumberFlowGroup>
          {tabs.map(({ id, label, colorClassName, conversions }, idx) => {
            return (
              <div key={id} className="relative z-0">
                {/* {idx > 0 && (
                  <div className="absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-neutral-200 bg-white p-1.5">
                    <ChevronRight
                      className="h-3 w-3 text-neutral-400"
                      strokeWidth={2.5}
                    />
                  </div>
                )} */}
                <Link
                  className={cn(
                    "border-box relative block h-full flex-none px-4 py-3 sm:px-8 sm:py-6",
                    "transition-colors hover:bg-neutral-50 focus:outline-none active:bg-neutral-100",
                    "ring-inset ring-neutral-500 focus-visible:ring-1",
                  )}
                  href={
                    queryParams({
                      set: {
                        event: id,
                      },
                      getNewPath: true,
                    }) as string
                  }
                  aria-current
                >
                  {/* Active tab indicator */}
                  <div
                    className={cn(
                      "absolute bottom-0 left-0 h-0.5 w-full bg-[#08272E] transition-transform duration-100",
                      tab.id !== id && "translate-y-[3px]", // Translate an extra pixel to avoid sub-pixel issues
                    )}
                  />

                  <div className="flex items-center gap-2.5 text-sm text-neutral-600">
                    {/* <div
                      className={cn(
                        "h-2 w-2 rounded-sm bg-current shadow-[inset_0_0_0_1px_#00000019]",
                        colorClassName,
                      )}
                    /> */}
                    <span>{label}</span>
                  </div>
                  <div className="mt-1 flex h-12 items-center">
                    {totalEvents?.[id] || totalEvents?.[id] === 0 ? (
                      <NumberFlow
                        value={
                          id === "sales" && saleUnit === "saleAmount"
                            ? totalEvents.saleAmount / 100
                            : totalEvents[id]
                        }
                        className={cn(
                          "text-xl font-medium sm:text-3xl",
                          showPaywall && "opacity-30",
                        )}
                        format={
                          id === "sales" && saleUnit === "saleAmount"
                            ? {
                                style: "currency",
                                currency: "USD",
                                // @ts-ignore – trailingZeroDisplay is a valid option but TS is outdated
                                trailingZeroDisplay: "stripIfInteger",
                              }
                            : {
                                notation:
                                  totalEvents[id] > 999999
                                    ? "compact"
                                    : "standard",
                              }
                        }
                      />
                    ) : requiresUpgrade ? (
                      <div className="block rounded-full bg-neutral-100 p-2.5">
                        <Lock className="h-4 w-4 text-neutral-500" />
                      </div>
                    ) : (
                      <div className="h-9 w-16 animate-pulse rounded-md bg-neutral-200" />
                    )}
                  </div>
                </Link>
                {/* {id === "sales" && (
                  <ToggleGroup
                    className="absolute right-3 top-3 hidden w-fit shrink-0 items-center gap-1 border-neutral-100 bg-neutral-100 sm:flex"
                    optionClassName="size-8 p-0 flex items-center justify-center"
                    indicatorClassName="border-[6px] border-neutral-100 bg-white"
                    options={[
                      {
                        label: <div className="text-base">$</div>,
                        value: "saleAmount",
                      },
                      {
                        label: <div className="text-[11px]">123</div>,
                        value: "sales",
                      },
                    ]}
                    selected={saleUnit}
                    selectAction={(option: AnalyticsSaleUnit) => {
                      queryParams({
                        set: { saleUnit: option },
                      });
                    }}
                  />
                )} */}
              </div>
            );
          })}
        </NumberFlowGroup>
      </div>
      <div className="relative">
        <div
          className={cn(
            "relative overflow-hidden rounded-b-xl border-x-[6px] border-b-[6px] border-neutral-100",
            showPaywall &&
              "pointer-events-none [mask-image:linear-gradient(#0006,#0006_25%,transparent_40%)]",
          )}
        >
          {view === "timeseries" && (
            <div className="p-5 pt-10 sm:p-10">
              <AnalyticsAreaChart resource={tab.id} demo={showPaywall} />
            </div>
          )}
          {view === "funnel" && <AnalyticsFunnelChart demo={showPaywall} />}
        </div>
        {/* <ToggleGroup
          className="absolute right-3 top-3 flex w-fit shrink-0 items-center gap-1 border-neutral-100 bg-neutral-100"
          optionClassName="size-8 p-0 flex items-center justify-center"
          indicatorClassName="border border-neutral-200 bg-white"
          options={[
            {
              label: <ChartLine className="size-4 text-neutral-600" />,
              value: "timeseries",
            },
            {
              label: <Filter2 className="size-4 -rotate-90 text-neutral-600" />,
              value: "funnel",
            },
          ]}
          selected={view}
          selectAction={(option) => {
            queryParams({
              set: { view: option },
            });
          }}
        /> */}
        {showPaywall && <ConversionTrackingPaywall />}
      </div>
    </div>
  );
}

function ConversionTrackingPaywall() {
  const { slug } = useWorkspace();

  return (
    <div className="animate-slide-up-fade pointer-events-none absolute inset-0 flex items-center justify-center pt-24">
      <div className="pointer-events-auto flex flex-col items-center">
        <div className="flex size-16 items-center justify-center rounded-full border-[6px] border-neutral-100 bg-neutral-50">
          <Coins className="size-6 text-neutral-800" />
        </div>
        <h2 className="mt-7 text-base font-semibold text-neutral-700">
          Real-time Sales tracking
        </h2>
        <p className="mt-4 max-w-sm text-center text-sm text-neutral-500">
          Want to see your sales in realtime ?{" "}
          <a
            href="https://pimms.io/guides/how-to-track-conversions-on-vibe-coding-ai-no-code-sites"
            target="_blank"
            className="font-medium underline underline-offset-4 hover:text-black"
          >
            Learn more
          </a>
        </p>
        <Link
          href={`/${slug}/upgrade`}
          className={cn(
            buttonVariants({ variant: "primary" }),
            "mt-4 flex h-9 items-center justify-center rounded-md border px-4 text-sm",
          )}
        >
          Upgrade to Pro
        </Link>
      </div>
    </div>
  );
}
