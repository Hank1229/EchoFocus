import { installChromeStub } from './chrome-stub'

// Guarantee `globalThis.chrome` exists before any module is imported — some
// background modules read the namespace while initializing. Individual tests
// call installChromeStub() again in beforeEach to get an isolated store.
installChromeStub()
