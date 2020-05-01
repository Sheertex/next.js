import fs from 'fs'
import nodePath from 'path'
import { ParsedUrlQuery } from 'querystring'

const AB_TEST_PAYLOAD_PREFIX = '--ab--'

function isValidName(name: string): boolean {
  if (!name) {
    return false
  }

  //Name should contain only a-z 0-9 and dash as it will be passed in the url
  return /^[a-z0-9-]+$/.test(name)
}

function assertNameIsValid(name: string): void {
  if (!name) {
    throw new Error('Name is undefined')
  }

  if (!isValidName(name)) {
    throw new Error(
      `"${name}" is not valid name. Use only lowercase latin symbols, digits and dash`
    )
  }

  return
}

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
    console.log('Failed to load experiments payload, file not found')

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

function tryStripABTestingPayloadFromQuery(
  query: ParsedUrlQuery
): ParsedUrlQuery {
  if (!query) {
    return query
  }

  // console.log(`IN: ${JSON.stringify(query)}`)

  let abTestingPayload = ''

  const resultQuery: ParsedUrlQuery = {}

  Object.keys(query).forEach(key => {
    const value = query[key]
    if (typeof value !== 'string') {
      resultQuery[key] = value
      return
    }

    const idx = value.indexOf(AB_TEST_PAYLOAD_PREFIX)
    if (idx === -1) {
      resultQuery[key] = value
      return
    }

    resultQuery[key] = value.slice(0, idx)
    abTestingPayload = value.slice(idx + AB_TEST_PAYLOAD_PREFIX.length)
  })

  if (!!abTestingPayload) {
    resultQuery['AB_TESTING_PAYLOAD'] = abTestingPayload
  }

  // console.log(`OUT: ${JSON.stringify(resultQuery)}`)

  return resultQuery
}

export {
  AB_TEST_PAYLOAD_PREFIX,
  tryAddABTestingPayload,
  tryStripABTestingPayloadFromQuery,
  assertNameIsValid,
  isValidName,
}
