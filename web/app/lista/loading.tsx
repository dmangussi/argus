import { ArrowLeft, ShoppingCart } from "lucide-react";

function SkeletonItem() {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-3.5 flex items-center gap-3">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3.5 bg-zinc-100 rounded-full animate-pulse w-4/5" />
        <div className="h-3 bg-zinc-100 rounded-full animate-pulse w-1/3" />
        <div className="h-3 bg-zinc-100 rounded-full animate-pulse w-2/5" />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <div className="w-6 h-6 rounded-full bg-zinc-100 animate-pulse" />
          <div className="w-6 h-4 bg-zinc-100 rounded animate-pulse" />
          <div className="w-6 h-6 rounded-full bg-zinc-100 animate-pulse" />
        </div>
        <div className="w-7 h-7 rounded-full bg-zinc-100 animate-pulse" />
      </div>
    </div>
  );
}

export default function ListaLoading() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-300">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-indigo-300" strokeWidth={2} />
            <div className="h-4 bg-zinc-100 rounded-full animate-pulse w-32" />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <div className="space-y-2">
          <SkeletonItem />
          <SkeletonItem />
          <SkeletonItem />
        </div>
        <div className="h-20 bg-indigo-50 rounded-2xl animate-pulse" />
        <div className="h-11 bg-zinc-100 rounded-2xl animate-pulse" />
      </main>
    </div>
  );
}
