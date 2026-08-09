export function SkeletonBoardCard() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-3 flex gap-2">
        <div className="h-3 w-16 rounded bg-slate-100 dark:bg-slate-800" />
        <div className="h-3 w-12 rounded bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="h-14 rounded-md bg-slate-50 dark:bg-slate-800" />
        <div className="h-14 rounded-md bg-slate-50 dark:bg-slate-800" />
        <div className="h-14 rounded-md bg-slate-50 dark:bg-slate-800" />
      </div>
    </div>
  );
}

export function SkeletonColumn() {
  return (
    <div className="animate-pulse rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
      <div className="mb-3 h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="space-y-2">
        <div className="h-14 rounded-lg border bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="h-3 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="mt-2 h-2 w-10 rounded bg-slate-50 dark:bg-slate-800" />
        </div>
        <div className="h-14 rounded-lg border bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="mt-2 h-2 w-10 rounded bg-slate-50 dark:bg-slate-800" />
        </div>
        <div className="h-14 rounded-lg border bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="mt-2 h-2 w-10 rounded bg-slate-50 dark:bg-slate-800" />
        </div>
      </div>
      <div className="mt-3 h-8 w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

export function SkeletonBoardDetail() {
  return (
    <section>
      <div className="mb-4 h-6 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <SkeletonBoardCard />
      <SkeletonBoardCard />
      <SkeletonBoardCard />
      <SkeletonBoardCard />
      <SkeletonBoardCard />
      <SkeletonBoardCard />
    </div>
  );
}
