import { cn, createHref } from "@dub/utils";
import { Link as NavigationMenuLink } from "@radix-ui/react-navigation-menu";
import Image from "next/image";
import Link from "next/link";
import { RESOURCES } from "../../content";
import { DubWireframeGraphic } from "./graphics/dub-wireframe-graphic";
import { LargeLinkCard, getUtmParams } from "./shared";

const mainLinks = [
  {
    title: "Docs",
    description: "Platform documentation",
    thumbnail: "https://assets.pimms.io/thumbnail.jpg?v=3",
    href: "/docs/introduction",
  },
  {
    title: "Help Center",
    description: "Answers to your questions",
    thumbnail: "https://assets.pimms.io/thumbnail.jpg?v=3", // TODO: Update
    href: "/help",
  },
];

export function ResourcesContent({ domain }: { domain: string }) {
  return (
    <div className="grid w-[1020px] grid-cols-[minmax(0,1fr),0.45fr] divide-x divide-neutral-200 dark:divide-white/20">
      <div className="grid grid-cols-2 gap-4 p-4">
        {mainLinks.map(({ title, description, thumbnail, href }) => (
          <NavigationMenuLink key={title} asChild>
            <Link
              key={title}
              href={createHref(
                href,
                domain,
                getUtmParams({ domain, utm_content: title }),
              )}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50 transition-colors duration-75 hover:bg-neutral-100/80",
                "dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/15",
              )}
            >
              <div className="p-5 pb-0">
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {title}
                </span>
                <p className="mt-3 max-w-56 text-sm text-neutral-500 dark:text-white/60">
                  {description}
                </p>
              </div>
              <div className="relative mt-7 grow overflow-hidden pl-5 [mask-image:linear-gradient(90deg,black_50%,transparent)]">
                <div
                  className={cn(
                    "relative size-full overflow-hidden rounded-tl-lg border-l border-t border-black/10",
                    "[mask-image:linear-gradient(black_50%,transparent)]",
                  )}
                >
                  <Image
                    src={thumbnail}
                    alt={`${title} thumbnail`}
                    fill
                    className="bg-white object-cover object-left-top grayscale transition-[filter] duration-75 group-hover:grayscale-0 dark:opacity-50"
                  />
                </div>
              </div>
            </Link>
          </NavigationMenuLink>
        ))}
      </div>
      <div className="flex flex-col gap-4 p-4">
        {RESOURCES.filter(
          ({ title }) => !["Docs", "Help Center", "Dub Brand"].includes(title),
        ).map(({ title, description, icon, href }) => (
          <LargeLinkCard
            key={title}
            title={title}
            description={description}
            icon={icon}
            iconClassName="size-5"
            href={createHref(
              href,
              domain,
              getUtmParams({ domain, utm_content: title }),
            )}
          />
        ))}
        <NavigationMenuLink asChild>
          <Link
            href={createHref(
              "/brand",
              domain,
                getUtmParams({ domain, utm_content: "PIMMS Brand" }),
            )}
            className="group relative flex flex-col overflow-hidden rounded-xl bg-black transition-colors duration-75 dark:border dark:border-white/20"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -inset-[50%] opacity-30 blur-[20px] transition-opacity duration-300 group-hover:opacity-40 dark:group-hover:opacity-35">
                <div
                  className={cn(
                    "absolute inset-0 rounded-xl",
                    "bg-[radial-gradient(20%_80%_at_50%_100%,#fd3a4e,transparent),radial-gradient(30%_80%_at_40%_50%,#855afc,transparent),radial-gradient(30%_80%_at_60%_50%,#72fe7d,transparent),radial-gradient(30%_100%_at_50%_50%,#e4c795,transparent)]",
                  )}
                />
              </div>
              <DubWireframeGraphic className="absolute right-0 top-1/2 h-auto w-full -translate-y-1/2 translate-x-[33%] [mask-image:linear-gradient(90deg,#000a,transparent)]" />
            </div>
            <div className="relative flex items-center justify-between px-5 py-4">
              <div>
                <span className="block text-sm font-medium text-white">
                  PIMMS Brand
                </span>
                <p className="text-sm text-white/60">Logos, wordmark, etc.</p>
              </div>
            </div>
          </Link>
        </NavigationMenuLink>
      </div>
    </div>
  );
}
