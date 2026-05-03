export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="h-8 w-48 bg-zinc-200 rounded-lg animate-pulse" />

      {/* Cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-zinc-200 p-5">
            <div className="h-4 w-24 bg-zinc-100 rounded animate-pulse mb-3" />
            <div className="h-8 w-16 bg-zinc-200 rounded animate-pulse mb-1" />
            <div className="h-3 w-20 bg-zinc-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5">
        <div className="h-5 w-32 bg-zinc-200 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-100 animate-pulse flex-none" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-zinc-200 rounded animate-pulse" style={{ width: `${60 + i * 5}%` }} />
                <div className="h-3 bg-zinc-100 rounded animate-pulse w-1/3" />
              </div>
              <div className="h-5 w-16 bg-zinc-100 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
