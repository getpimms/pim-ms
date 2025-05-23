"use client";

import useWorkspaces from "@/lib/swr/use-workspaces";
import { ModalContext } from "@/ui/modals/modal-provider";
import { Button, TooltipContent } from "@dub/ui";
import { FREE_WORKSPACES_LIMIT } from "@dub/utils";
import { useContext } from "react";

export default function CreateWorkspaceButton() {
  const { setShowAddWorkspaceModal } = useContext(ModalContext);
  const { freeWorkspaces, exceedingFreeWorkspaces } = useWorkspaces();

  return (
    <div>
      <Button
        text="Create workspace"
        disabledTooltip={
          exceedingFreeWorkspaces ? (
            <TooltipContent
              title={`You can only create up to ${FREE_WORKSPACES_LIMIT} free workspaces. Additional workspaces require a paid plan.`}
              cta="Upgrade to Pro"
              href={
                freeWorkspaces
                  ? `/${freeWorkspaces[0].slug}/upgrade`
                  : "https://pimms.io/pricing"
              }
            />
          ) : undefined
        }
        className="flex-shrink-0 truncate"
        onClick={() => setShowAddWorkspaceModal(true)}
      />
    </div>
  );
}
