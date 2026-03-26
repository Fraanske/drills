type VersionBadgeProps = {
  version: string;
};

function formatVersion(version: string) {
  return version.replace(/\.0$/, "");
}

export function VersionBadge({ version }: VersionBadgeProps) {
  return (
    <div className="fixed right-4 top-4 z-50 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm backdrop-blur">
      v{formatVersion(version)}
    </div>
  );
}
