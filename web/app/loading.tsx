import { Eye, Settings } from "lucide-react";

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl border border-zinc-200 p-3.5">
      <div className="w-16 h-16 rounded-xl shrink-0 bg-zinc-100 animate-pulse" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3.5 bg-zinc-100 rounded-full animate-pulse w-4/5" />
        <div className="h-3 bg-zinc-100 rounded-full animate-pulse w-2/5" />
        <div className="h-5 bg-zinc-100 rounded animate-pulse w-20 mt-1" />
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="h-6 bg-zinc-100 rounded-full animate-pulse w-20" />
        <div className="h-5 bg-zinc-100 rounded-full animate-pulse w-12" />
      </div>
    </div>
  );
}

function SkeletonCategory({ cards }: { cards: number }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-zinc-200 animate-pulse shrink-0" />
        <div className="h-3 bg-zinc-100 rounded-full animate-pulse w-24" />
        <div className="h-4 bg-zinc-100 rounded-full animate-pulse w-6" />
      </div>
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </section>
  );
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl btn-brand flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 leading-none">Argus</h1>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-none tracking-wide">monitor de preços</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-6 bg-zinc-100 rounded-full animate-pulse w-36" />
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-300">
              <Settings className="w-4.5 h-4.5" strokeWidth={1.75} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-6">
        {/* Search + controls skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-9 bg-zinc-100 rounded-xl animate-pulse flex-1" />
          <div className="h-9 bg-zinc-100 rounded-xl animate-pulse w-24" />
        </div>

        {/* Filter badges skeleton */}
        <div className="grid grid-cols-4 gap-1.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-9 bg-zinc-100 rounded-full animate-pulse" />
          ))}
        </div>

        <hr className="border-zinc-200" />

        <div className="space-y-4">
          <SkeletonCategory cards={3} />
          <SkeletonCategory cards={2} />
          <SkeletonCategory cards={4} />
        </div>
      </main>
    </div>
  );
}
