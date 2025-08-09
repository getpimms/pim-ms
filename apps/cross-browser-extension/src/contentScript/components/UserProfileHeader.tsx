import { APP_DOMAIN } from "@dub/utils";
import React from "react";
import { UserData, WorkspaceData } from "../hooks/useUserData";

interface UserProfileHeaderProps {
  user: UserData | null;
  workspace: WorkspaceData | null;
  onClick?: () => void;
  className?: string;
  showWorkspaceName?: boolean;
}

const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({
  user,
  workspace,
  onClick,
  className = "",
  showWorkspaceName = true,
}) => {
  if (!user) return null;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default behavior: open dashboard
      const dashboardUrl = workspace
        ? `${APP_DOMAIN}/${workspace.slug}`
        : `${APP_DOMAIN}/dashboard`;
      chrome.runtime.sendMessage({ type: "OPEN_WEB_APP", url: dashboardUrl });
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getDisplayName = (): string | null => {
    if (showWorkspaceName && workspace?.name) {
      return workspace.name;
    }
    return null;
  };

  const getSecondaryText = (): string | null => {
    return user.email || null;
  };

  return (
    <div
      className={`flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80 ${className}`}
      onClick={handleClick}
      title="Open Dashboard"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {user.image ? (
          <img
            src={user.image}
            alt={user.email}
            className="h-6 w-6 rounded-full border border-neutral-200 object-cover"
          />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-medium text-white">
            {getInitials(user.email)}
          </div>
        )}
      </div>

      {/* User/Workspace Info */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="truncate text-xs text-neutral-500">
          {getSecondaryText()}
        </div>
      </div>

      {/* External link icon */}
      <svg
        viewBox="0 0 20 20"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0 text-neutral-400"
        aria-hidden="true"
      >
        <path d="M7 13l6-6" />
        <path d="M9 7h4v4" />
        <path d="M5 5h6a4 4 0 0 1 4 4v6" opacity=".3" />
      </svg>
    </div>
  );
};

export default UserProfileHeader;
