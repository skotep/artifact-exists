import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

import * as core from '@actions/core'
import artifactClient from '@actions/artifact'
import {Minimatch} from 'minimatch'

import {Inputs, Outputs} from './constants'

async function run(): Promise<void> {
  try {
    const name = core.getInput(Inputs.Name, {required: true})
    const files = core.getInput(Inputs.Files, {required: true}).split(',')
    const failOnMissing = core.getInput(Inputs.FailOnMissing, {required: false})
    core.info(`Looking for \u001b[35m"${files}"\u001b[0m in artifact "${name}"`)

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-'))
    core.debug(`Temporary path is ${tmpDir}`)

    const artifacts = await (async () => {
      if (!name.includes('*')) {
        // download a single artifact
        const response = await artifactClient.getArtifact(name)
        return [response.artifact]
      }

      const listArtifactResponse = await artifactClient.listArtifacts({
        latest: true,
      })
      core.info(`Filtering ${listArtifactResponse.artifacts.length} artifacts by pattern '${name}'`)
      const matcher = new Minimatch(name)
      return listArtifactResponse.artifacts.filter(artifact => matcher.match(artifact.name))
    })();

    core.info(`==> downloading ${artifacts.length} artifacts to ${tmpDir}`)
    const results = await Promise.all(artifacts.map(artifact => {
      core.info(`downloading artifact "${artifact.name}" id=${artifact.id} size=${artifact.size}`)
      return artifactClient.downloadArtifact(artifact.id, { path: tmpDir })
    }));

    const exists = files.filter(file => fs.existsSync(path.join(tmpDir, file)))
    const allFound = files.length == exists.length
    core.setOutput(Outputs.AllFound, allFound)
    core.setOutput(Outputs.FilesFound, exists)
    core.info(`\u001b[1;${allFound ? 32 : 34}mThese files were found "${exists}"`)
    if (!allFound && failOnMissing) {
      core.info(`Artifact contains: ${fs.readdirSync(tmpDir)}`)
      core.setFailed(`Only found "${exists}" of requested "${files}" files`)
    }
  } catch (err: any) {
    core.setFailed(err.message)
  }
}

run()
