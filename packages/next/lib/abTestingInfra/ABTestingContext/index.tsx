import React from 'react'
import { AB_TEST_PAYLOAD_PREFIX } from '../utils'

type ABTestingPayload = {
  [name: string]: string
}

const defaultABTestingContext: ABTestingPayload = {}
const ABTestingContext = React.createContext(defaultABTestingContext)

function getABTestContextFromPath(path: string): ABTestingPayload {
  console.log(`Received path: ${path}`)
  const idx = path.indexOf(AB_TEST_PAYLOAD_PREFIX)

  if (idx === -1) {
    return {}
  }

  const normalizedPath = path.replace(/\/$/, '') // removing possible trailing slash
  const testPayload = normalizedPath.slice(idx + AB_TEST_PAYLOAD_PREFIX.length)
  const context = JSON.parse(decodeURIComponent(testPayload))

  return context
}

type Props = {
  children: React.ReactNode
  path: string
}

function ABTestingContextProvider({ children, path }: Props): JSX.Element {
  return (
    <ABTestingContext.Provider value={getABTestContextFromPath(path)}>
      {children}
    </ABTestingContext.Provider>
  )
}

const ABTestingContextConsumer = ABTestingContext.Consumer

export { ABTestingContextProvider, ABTestingContextConsumer }
