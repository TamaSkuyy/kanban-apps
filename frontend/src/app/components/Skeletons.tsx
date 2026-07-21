export function SkeletonBoardCard() {
  return (
    <div className="animate-pulse rounded-lg border bg-white p-4 shadow-sm">
      <div className="h-6 w-2/3 rounded bg-slate-200" />
      <div className="mt-3 h-4 w-12 rounded bg-slate-100" />
    </div>
  );
}

export function SkeletonColumn() {
  return (
    <div className="animate-pulse rounded-lg bg-slate-100 p-3">
      <div className="mb-3 h-4 w-24 rounded bg-slate-200" />
      <div className="space-y-2">
        <div className="h-16 rounded border bg-white p-2 shadow-sm">
          <div className="h-4 w-3/4 rounded bg-slate-100" />
          <div className="mt-2 h-3 w-10 rounded bg-slate-50" />
        </div>
        <div className="h-16 rounded border bg-white p-2 shadow-sm">
          <div className="h-4 w-1/2 rounded bg-slate-100" />
          <div className="mt-2 h-3 w-10 rounded bg-slate-50" />
        </div>
        <div className="h-16 rounded border bg-white p-2 shadow-sm">
          <div className="h-4 w-2/3 rounded bg-slate-100" />
          <div className="mt-2 h-3 w-10 rounded bg-slate-50" />
        </div>
      </div>
      <div className="mt-3 h-9 w-full rounded bg-slate-200" />
    </div>
  );
}

export function SkeletonBoardDetail() {
  return (
    <section>
      <div className="mb-4 h-7 w-48 animate-pulse rounded bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3">
        <SkeletonColumn />
        <SkeletonColumn />
        <SkeletonColumn />
      </div>
    </section>
  );
}

export function SkeletonBoardList() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <SkeletonBoardCard />
      <SkeletonBoardCard />
      <SkeletonBoardCard />
    </div>
  );
}
