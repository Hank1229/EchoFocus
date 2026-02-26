import Image from 'next/image'

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-96">
      <div className="animate-pulse">
        <Image src="/images/logo-icon.png" alt="EchoFocus logo" width={48} height={48} className="rounded-xl" />
      </div>
      <p className="text-slate-400 text-sm mt-3">Loading...</p>
    </div>
  )
}
