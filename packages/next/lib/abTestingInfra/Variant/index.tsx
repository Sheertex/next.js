import React from 'react'
import { assertNameIsValid } from '../utils'

type VariantProps = {
  name: string
  children: React.ReactNode
}

function Variant(props: VariantProps): JSX.Element {
  assertNameIsValid(props.name)

  if (React.isValidElement(props.children)) {
    return props.children
  } else {
    return <span>{props.children}</span>
  }
}

Variant.displayName = 'Variant'

export default Variant
