export default function LoadingSpinner({ height = 200 }: { height?: number }) {
  return (
    <div
      className="flex items-center justify-center w-full"
      style={{ height }}
    >
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "#FD5108", borderTopColor: "transparent" }}
      />
    </div>
  );
}

export function SkeletonChart({ height = 220 }: { height?: number }) {
  return (
    <div className="animate-pulse w-full" style={{ height }}>
      <div className="h-full bg-gray-100 rounded" />
    </div>
  );
}
