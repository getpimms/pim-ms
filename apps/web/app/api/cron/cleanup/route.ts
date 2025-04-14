import { markDomainAsDeleted } from "@/lib/api/domains";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { deletePartner } from "@/lib/api/partners/delete-partner";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const E2E_USER_ID = "clxz1q7c7000hbqx5ckv4r82h";
const E2E_WORKSPACE_ID = "clrei1gld0002vs9mzn93p8ik";
const E2E_PROGRAM_ID = "prog_CYCu7IMAapjkRpTnr8F1azjN";

/***
    This route is used to remove links, domains and tags created during the E2E test.
    Runs every 6 hours (0 * / 6 * * *)
*/
// GET /api/cron/cleanup
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const oneHourAgo = new Date(Date.now() - 1000 * 60 * 60);

    const [links, domains, tags, partners] = await Promise.all([
      prisma.link.findMany({
        where: {
          userId: E2E_USER_ID,
          projectId: E2E_WORKSPACE_ID,
          createdAt: {
            lt: oneHourAgo,
          },
        },
        include: {
          tags: {
            select: {
              tag: true,
            },
          },
        },
        take: 100,
      }),

      prisma.domain.findMany({
        where: {
          projectId: E2E_WORKSPACE_ID,
          slug: {
            endsWith: ".dub-internal-test.com",
          },
          createdAt: {
            lt: oneHourAgo,
          },
        },
        select: {
          slug: true,
        },
      }),

      prisma.tag.findMany({
        where: {
          projectId: E2E_WORKSPACE_ID,
          name: {
            startsWith: "e2e-",
          },
          createdAt: {
            lt: oneHourAgo,
          },
        },
      }),

      prisma.partner.findMany({
        where: {
          email: {
            endsWith: "@pimms-internal-test.com",
          },
          createdAt: {
            lt: oneHourAgo,
          },
        },
        select: {
          id: true,
          programs: {
            where: {
              programId: E2E_PROGRAM_ID,
            },
          },
        },
      }),
    ]);

    // Delete the links
    if (links.length > 0) {
      await prisma.link.deleteMany({
        where: {
          id: {
            in: links.map((link) => link.id),
          },
        },
      });

      // Post delete cleanup
      await bulkDeleteLinks(links);
    }

    // Delete the domains
    if (domains.length > 0) {
      await Promise.all(
        domains.map(({ slug }) =>
          markDomainAsDeleted({
            domain: slug,
            workspaceId: E2E_WORKSPACE_ID,
          }),
        ),
      );
    }

    // Delete the tags
    if (tags.length > 0) {
      await prisma.tag.deleteMany({
        where: {
          id: {
            in: tags.map((tag) => tag.id),
          },
        },
      });
    }

    // Delete the partners
    if (partners.length > 0) {
      await Promise.all(
        partners.map((partner) =>
          deletePartner({
            partnerId: partner.id,
          }),
        ),
      );
    }

    console.log("Removed the following items.", {
      links: links.length,
      domains: domains.length,
      tags: tags.length,
      partners: partners.length,
    });

    return NextResponse.json({ status: "OK" });
  } catch (error) {
    await log({
      message: `Links and domain cleanup failed - ${error.message}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
