import { vaidateAuthorizeRequest } from "@/lib/api/oauth/actions";
import { getSession } from "@/lib/auth";
import z from "@/lib/zod";
import { authorizeRequestSchema } from "@/lib/zod/schemas/oauth";
import EmptyState from "@/ui/shared/empty-state";
import { BlurImage, Wordmark } from "@dub/ui";
import { CircleWarning, CubeSettings } from "@dub/ui/icons";
import { HOME_DOMAIN, constructMetadata } from "@dub/utils";
import { ArrowLeftRight } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthorizeForm } from "./authorize-form";
import { ScopesRequested } from "./scopes-requested";

export const runtime = "nodejs";

export const metadata = constructMetadata({
  title: "Authorize API access | PIMMS",
  noIndex: true,
});

// OAuth app consent page
export default async function Authorize({
  searchParams,
}: {
  searchParams?: z.infer<typeof authorizeRequestSchema>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { error, integration, requestParams } =
    await vaidateAuthorizeRequest(searchParams);

  if (error || !integration) {
    return (
      <EmptyState
        icon={CubeSettings}
        title="Invalid OAuth Request"
        description={error}
      />
    );
  }

  return (
    <div className="relative z-10 m-auto w-full max-w-md border-y border-neutral-200 sm:rounded-2xl sm:border sm:shadow-xl">
      <div className="flex flex-col items-center justify-center gap-3 border-b-[6px] border-neutral-100 bg-white px-4 py-6 pt-8 text-center sm:rounded-t-2xl sm:px-16">
        <div className="flex items-center gap-3">
          <a href={integration.website} target="_blank" rel="noreferrer">
            {integration.logo ? (
              <BlurImage
                src={integration.logo}
                alt={`Logo for ${integration.name}`}
                className="size-12 rounded-full border-[6px] border-neutral-100"
                width={20}
                height={20}
              />
            ) : (
              <Wordmark className="size-24" />
            )}
          </a>
          <ArrowLeftRight className="size-5 text-neutral-500" />
          <a href={HOME_DOMAIN} target="_blank" rel="noreferrer">
            <Wordmark className="size-24" />
          </a>
        </div>

        <p className="text-md">
          <span className="font-bold">{integration.name}</span> is requesting
          API access to a workspace on PIMMS.
        </p>
        <span className="text-xs text-neutral-500">
          Built by{" "}
          <a
            href={integration.website}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {integration.developer}
          </a>
        </span>

        {!integration.verified && (
          <div className="flex items-center gap-2 rounded-md bg-yellow-50 p-2 text-sm text-yellow-700">
            <CircleWarning className="size-4" />
            <span>PIMMS hasn't verified this app</span>
          </div>
        )}
      </div>
      <div className="flex flex-col space-y-3 bg-white px-2 py-6 sm:px-10">
        <ScopesRequested scopes={requestParams.scope} />
      </div>
      <div className="flex flex-col space-y-2 border-t-[6px] border-neutral-100 bg-white px-2 py-6 sm:rounded-b-2xl sm:px-10">
        <Suspense>
          <AuthorizeForm {...requestParams} />
        </Suspense>
      </div>
    </div>
  );
}
