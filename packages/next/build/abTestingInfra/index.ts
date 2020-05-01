import fs from 'fs'
import nodePath from 'path'
import { ParsedUrlQuery } from 'querystring'

const AB_TEST_PAYLOAD_PREFIX = '--ab--'

interface Experiment {
  name: string
  variants: Array<string>
}

interface ExperimentVariant {
  [key: string]: string
}

function getPermutationForExperiment(
  experiment: Experiment
): Array<ExperimentVariant> {
  const result: Array<ExperimentVariant> = []

  experiment.variants.forEach(variantName => {
    const item: ExperimentVariant = {}

    item[experiment.name] = variantName
    result.push(item)
  })

  return result
}

function getPermutations(
  experimentsArray: Array<Experiment>
): Array<ExperimentVariant> | undefined {
  if (!experimentsArray || experimentsArray.length === 0) {
    return undefined
  }

  const curPermutaions = getPermutationForExperiment(experimentsArray[0])

  if (experimentsArray.length === 1) {
    return curPermutaions
  }

  const permutations: Array<ExperimentVariant> = []

  const otherPermutations = getPermutations(experimentsArray.slice(1)) as Array<
    ExperimentVariant
  >

  curPermutaions.forEach(expPerm => {
    otherPermutations.forEach(otherPerm => {
      permutations.push({ ...expPerm, ...otherPerm })
    })
  })

  return permutations
}

function tryAddABTestingPayload(
  paths: Array<{ params: ParsedUrlQuery }>
): Array<{ params: ParsedUrlQuery }> {
  const CWD = process.cwd()
  const pathToExperimentsPayload = nodePath.join(CWD, 'experiments.json')

  if (!fs.existsSync(pathToExperimentsPayload)) {
    console.warn('Failed to load experiments payload, file not found')

    return paths
  }

  const experiments = JSON.parse(
    fs.readFileSync(pathToExperimentsPayload, 'utf8')
  )

  const numberOfExperiments = Object.keys(experiments).length

  console.log(
    `${numberOfExperiments} experiment(s) loaded. ${JSON.stringify(
      experiments
    )}`
  )

  if (numberOfExperiments > 5) {
    throw new Error(
      `Too much experiments ${numberOfExperiments}, it will produce at least ${Math.pow(
        numberOfExperiments,
        2
      )} variants of each page`
    )
  }

  const transformed: Array<Experiment> = []

  Object.keys(experiments).forEach(expName => {
    transformed.push({ name: expName, variants: experiments[expName] })
  })

  const permutatedExperiments = getPermutations(transformed) as Array<
    ExperimentVariant
  >

  const result: Array<{ params: ParsedUrlQuery }> = []

  paths.forEach(p => {
    permutatedExperiments.forEach(pExp => {
      const serializedAbTestingCtx = JSON.stringify(pExp) //next.js will do uriEncode for us

      result.push({
        params: {
          handle: `${p.params.handle}${AB_TEST_PAYLOAD_PREFIX}${serializedAbTestingCtx}`,
        },
      })
    })
  })

  return result
}

export { tryAddABTestingPayload }
