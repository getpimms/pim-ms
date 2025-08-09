import React from "react";
import PimmsWordmark from "./PimmsWordmark";

interface LauncherProps {
  onClick: () => void;
}

const Launcher: React.FC<LauncherProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      title="Open PIMMS"
      className="fixed right-0 top-1/2 z-[2147483647] -translate-y-1/2 rounded-l-xl border border-neutral-200 bg-white shadow-md"
      style={{ width: 46, height: 140, overflow: "hidden" }}
    >
      <div className="flex h-full w-full flex-col items-center gap-2">
        <div className="h-2" />
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f0ff]">🔗</span>
        <div className="h-4" />
        <div className="h-3 -rotate-90 origin-center">
          <PimmsWordmark className="h-3 w-auto" />
        </div>
      </div>
    </button>
  );
};

export default Launcher;


