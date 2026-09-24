interface Props {
  /** Which page shape to trace while the server data is in flight. */
  shape: 'today' | 'trends'
}

// Static blocks matching the final layout's dimensions — DESIGN.md section 5:
// skeletons, zero layout shift, and no infinite pulse animation.
const BLOCK = 'rounded bg-surface-hover'

export default function PageSkeleton({ shape }: Props) {
  return (
    <>
      <div className="h-16 border-b border-line" />
      <div className="mx-auto w-full max-w-[1200px] px-6 pt-8">
        {shape === 'today' && (
          <>
            <div className="rounded-lg border border-line bg-surface p-6 sm:p-7">
              <div className={`${BLOCK} h-3 w-24`} />
              <div className={`${BLOCK} mt-2 h-12 w-48`} />
              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                {[0, 1, 2, 3].map(i => (
                  <div key={i}>
                    <div className={`${BLOCK} h-3 w-20`} />
                    <div className={`${BLOCK} mt-2 h-7 w-24`} />
                  </div>
                ))}
              </div>
              <div className="mt-7 border-t border-line pt-6">
                <div className={`${BLOCK} h-3 w-24`} />
                <div className={`${BLOCK} mt-4 h-4 w-full max-w-[65ch]`} />
                <div className={`${BLOCK} mt-2 h-4 w-3/4`} />
              </div>
            </div>
            <div className={`${BLOCK} mt-10 h-16`} />
            <div className="mt-10 space-y-3">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`${BLOCK} h-4 w-full`} />
              ))}
            </div>
          </>
        )}

        {shape === 'trends' && (
          <>
            <div className="flex gap-10 border-b border-line pb-9">
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
      </div>
    </>
  )
}
