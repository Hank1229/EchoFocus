interface Props {
  /** Which page shape to trace while the server data is in flight. */
  shape: 'today' | 'trends' | 'snapshots'
}

const BLOCK = 'animate-pulse rounded bg-slate-800/60'

export default function PageSkeleton({ shape }: Props) {
  return (
    <>
      <div className="h-16 border-b border-slate-800/80" />
      <div className="mx-auto w-full max-w-5xl px-6 pt-8">
        {shape === 'today' && (
          <>
            <div className="flex items-center gap-9 border-b border-slate-800/80 pb-8">
              <div className={`${BLOCK} h-[132px] w-[132px] rounded-full`} />
              <div className="flex-1 space-y-3">
                <div className={`${BLOCK} h-8 w-64`} />
                <div className={`${BLOCK} h-4 w-80`} />
                <div className={`${BLOCK} mt-6 h-1.5 w-full rounded-full`} />
              </div>
            </div>
            <div className={`${BLOCK} mt-10 h-56 rounded-2xl`} />
            <div className="mt-10 space-y-3">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`${BLOCK} h-4 w-full`} />
              ))}
            </div>
          </>
        )}

        {shape === 'trends' && (
          <>
            <div className="flex gap-10 border-b border-slate-800/80 pb-9">
              <div className={`${BLOCK} h-16 w-28`} />
              <div className={`${BLOCK} h-56 flex-1`} />
            </div>
            <div className="mt-10 grid grid-cols-4 gap-6">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`${BLOCK} h-14`} />
              ))}
            </div>
            <div className={`${BLOCK} mt-10 h-56`} />
          </>
        )}

        {shape === 'snapshots' && (
          <>
            <div className={`${BLOCK} h-10 w-full`} />
            <div className={`${BLOCK} mt-10 h-52 rounded-2xl`} />
            <div className="mt-10 space-y-3">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className={`${BLOCK} h-4 w-full`} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
