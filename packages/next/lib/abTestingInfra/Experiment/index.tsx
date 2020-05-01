import React from 'react'
import { assertNameIsValid } from '../utils'
import { ABTestingContextConsumer } from '../ABTestingContext'

type Variants = {
  [name: string]: JSX.Element
}

// TODO: remove and import from file
type VariantProps = {
  name: string
  children: React.ReactNode
}

const filterVariants = (children: React.ReactNode): Variants => {
  const variants: Variants = {}

  React.Children.forEach(
    children as Array<React.Component>,
    (element: React.Component) => {
      if (
        !React.isValidElement(element) ||
        (element.type as React.SFC).displayName !== 'Variant'
      ) {
        throw new Error('Experiment children must be Variant components.')
      }

      variants[(element.props as VariantProps).name] = element
    }
  )

  return variants
}

type ExperimentProps = {
  name: string
  defaultVariantName: string
  children: React.ReactNode
}

function Experiment(props: ExperimentProps): JSX.Element {
  const variants = filterVariants(props.children)

  assertNameIsValid(props.name)
  assertNameIsValid(props.defaultVariantName)

  if (!variants[props.defaultVariantName]) {
    throw new Error(
      `Variant with the name "${props.defaultVariantName}" is not found. Maybe you made a typo in defaultVariantName?`
    )
  }

  return (
    <ABTestingContextConsumer>
      {payload => {
        const selectedVariantName = payload[props.name]

        console.log(`Got payload -> ${JSON.stringify(payload)}`)

        if (!selectedVariantName) {
          console.error(
            `Did not receive selected variant for experiment "${props.name}", will use default "${props.defaultVariantName}"`
          )

          return variants[props.defaultVariantName]
        }

        if (!variants[selectedVariantName]) {
          console.error(
            `Can't find "${selectedVariantName}" variant in experiment "${props.name}", will use default variant "${props.defaultVariantName}"`
          )

          return variants[props.defaultVariantName]
        }

        return variants[selectedVariantName]
      }}
    </ABTestingContextConsumer>
  )
}

export default Experiment
