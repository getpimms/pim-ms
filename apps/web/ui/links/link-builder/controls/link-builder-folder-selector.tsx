import { FolderDropdown } from "@/ui/folders/folder-dropdown";
import { useFormContext, useWatch } from "react-hook-form";
import { LinkFormData } from "../link-builder-provider";

export function LinkBuilderFolderSelector() {
  const { setValue } = useFormContext<LinkFormData>();
  const folderId = useWatch({ name: "folderId" });

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-sm font-medium text-neutral-700">Folder</h2>
      </div>
      <FolderDropdown
        variant="input"
        hideViewAll={true}
        disableAutoRedirect={true}
        onFolderSelect={(folder) => {
          setValue("folderId", folder.id === "unsorted" ? null : folder.id, {
            shouldDirty: true,
          });
        }}
        buttonClassName="w-full min-w-0 bg-transparent h-10 md:h-8 md:pl-1 rounded"
        buttonTextClassName="text-sm md:text-sm font-medium"
        iconClassName="size-3"
        selectedFolderId={folderId ?? undefined}
        loadingPlaceholder={
          <div className="my-px h-10 w-full animate-pulse rounded bg-neutral-200 md:h-8" />
        }
      />
    </div>
  );
}
