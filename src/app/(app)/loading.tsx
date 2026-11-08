import { Skeleton } from "@/components/ui/feedback";

export default function AppLoading() {
  return (
    <div
      className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="w-full max-w-lg space-y-2.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-3 w-80 max-w-full" />
        </div>
        <Skeleton className="hidden h-9 w-28 sm:block" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <div className="space-y-5">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>

      <span className="sr-only">Loading your workspace</span>
    </div>
  );
}
