import { cn } from "@dub/utils";
import React from "react";
import { LinkData } from "../../types";
import isPimmsLink from "../utils/isPimmsLink";
import { formatUrl } from "../utils/formatUrl";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import { IconArrowLeft } from "./ui/icons";

interface HoveredLinkProps {
  link: LinkData;
  onBackToList: () => void;
  onShortenClick: (href: string) => void;
  isLoading?: boolean;
  shortenedHref?: string | null; // when present, show copy CTA
  onCopyShortened?: (href: string) => void;

}

const HoveredLink: React.FC<HoveredLinkProps> = ({
  link,
  onBackToList,
  onShortenClick,
  isLoading = false,
  shortenedHref,
  onCopyShortened,

}) => {
  const { domainPart, pathAndParams } = formatUrl(link.href);
  const isAlreadyPimms = isPimmsLink(link.href);
  const hasShortened = Boolean(shortenedHref);

  return (
    <div className="flex h-[340px] flex-col p-4">
      {/* Back button using shadcn Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onBackToList}
        className={cn(
          "mb-4 justify-start gap-2 text-sm font-normal",
          "text-neutral-600 hover:text-neutral-900",
        )}
      >
        <IconArrowLeft className="h-3 w-3" />
        Back to list
      </Button>

      {/* Card with shadcn styling */}
      <div
        className={cn(
          "mb-3 flex-1 rounded-xl border border-neutral-200 bg-white p-3",
          "transition-shadow",
        )}
      >
        <div className="mb-3">
          <Badge variant="secondary" className="text-[11px]">
            {link.text}
          </Badge>
        </div>

        <div className="break-all font-mono text-[13px]">
          <span className="font-semibold text-[#3971ff]">{domainPart}</span>
          <span className="text-neutral-700">{pathAndParams}</span>
        </div>

        {hasShortened && (
          <div className="break-all font-mono text-[13px]">
            <span className="font-semibold text-[#3971ff]">Generated: </span>
            <span className="text-neutral-900">{shortenedHref}</span>
          </div>
        )}
      </div>

      {/* Action button using shadcn Button */}
      {hasShortened ? (
        <Button
          variant="primary"
          size="lg"
          onClick={() => shortenedHref && onCopyShortened?.(shortenedHref)}
          className="mb-4 w-full"
        >
          Copy link
        </Button>
      ) : (
        <Button
          variant="primary"
          size="lg"
          onClick={() => !isAlreadyPimms && onShortenClick(link.href)}
          loading={isLoading}
          className="mb-4 w-full"
          disabled={isAlreadyPimms}
        >
          {isAlreadyPimms ? "Already a pim.ms link" : "Shorten with PIMMS"}
        </Button>
      )}
    </div>
  );
};

export default HoveredLink;
