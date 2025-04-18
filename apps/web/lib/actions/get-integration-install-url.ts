"use server";

import { getSlackInstallationUrl } from "../integrations/slack/install";
import { getStripeInstallationUrl } from "../integrations/stripe/install";
import z from "../zod";
import { authActionClient } from "./safe-action";

const schema = z.object({
  workspaceId: z.string(),
  integrationSlug: z.string(),
  test: z.boolean().optional(),
});

// Get the installation URL for an integration
export const getIntegrationInstallUrl = authActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { integrationSlug, test } = parsedInput;

    let url: string | null = null;

    if (integrationSlug === "slack") {
      url = await getSlackInstallationUrl(workspace.id);
    } else if (integrationSlug === "stripe" && !test) {
      url = await getStripeInstallationUrl(workspace.id, false);
    } else if (integrationSlug === "stripe" && test) {
      url = await getStripeInstallationUrl(workspace.id, true);
    } else {
      throw new Error("Invalid integration slug");
    }

    return { url };
  });
