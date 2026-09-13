/** KD's Sovereign Desk — Clean Luxury Badge (No Cartoons) */
function AgentGuide({ signal }: { signal: SignalType }) {
  return (
    <div className={`${windowFrame} p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-center relative overflow-hidden`}>
      {/* Luxury Royal Crest Badge */}
      <div className="relative shrink-0 flex flex-col items-center">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20">
          <div className="w-full h-full rounded-2xl bg-gradient-to-b from-[#1c1813] to-[#0d0b08] border border-amber-300/40 flex flex-col items-center justify-center p-2 text-center">
            <span className="text-2xl sm:text-3xl mb-0.5 select-none drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]">
              👑
            </span>
            <span className="text-[10px] font-serif font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-400">
              KD
            </span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-amber-500/90">
              SOVEREIGN
            </span>
          </div>
        </div>
      </div>

      {/* Your Exact Original Decision Desk Logic & Guidance */}
      <div className="flex-1 text-center sm:text-left space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">
          Guide · levels only
        </div>
        <p className="text-sm text-slate-700 leading-relaxed font-medium">
          {signal === 'CALL' && 'Price above ORB high — bias CALL. Lock a horizon only if size is small and stop is set.'}
          {signal === 'PUT' && 'Price below ORB low — bias PUT. Lock only with clear invalidation.'}
          {signal === 'WAIT' && 'Inside ORB or no levels — WAIT. Protect capital; no forced trade.'}
        </p>
      </div>

      {/* Your Exact Original Status Indicator */}
      <div
        className={`px-5 py-3 rounded-2xl text-center min-w-[125px] border-2 font-black text-lg shadow-sm ${
          signal === 'CALL'
            ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
            : signal === 'PUT'
              ? 'bg-rose-100 border-rose-400 text-rose-800'
              : 'bg-amber-50 border-amber-300 text-amber-800'
        }`}
      >
        {signal === 'CALL' ? (
          <span className="inline-flex items-center gap-1.5"><TrendingUp className="w-5 h-5" /> CALL</span>
        ) : signal === 'PUT' ? (
          <span className="inline-flex items-center gap-1.5"><TrendingDown className="w-5 h-5" /> PUT</span>
        ) : (
          <span className="inline-flex items-center gap-1.5"><Minus className="w-5 h-5" /> WAIT</span>
        )}
      </div>
    </div>
  )
}
