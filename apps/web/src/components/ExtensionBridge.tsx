'use client'

import { useEffect } from 'react'
import { tellExtension } from '@/lib/extension-bridge'

// Any signed-in dashboard load tells the extension, which signs itself in
// silently if it isn't already. Idempotent and throttled on the other side.
export default function ExtensionBridge() {
  useEffect(() => {
    tellExtension('signed-in')
  }, [])
  return null
}
