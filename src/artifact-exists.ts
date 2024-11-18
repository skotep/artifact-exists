import * as core from '@actions/core'
import * as artifact from '@actions/artifact'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import {Inputs, Outputs} from './constants'

async function run(): Promise<void> {
  try {
    const name = core.getInput(Inputs.Name, {required: true})
    const files = core.getInput(Inputs.Files, {required: true}).split(',')
    const failOnMissing = core.getInput(Inputs.FailOnMissing, {required: false})
    core.info(`Looking for \u001b[35m"${files}"\u001b[0m in artifact "${name}"`)

    core.setOutput(Outputs.AllFound, true)
    core.setOutput(Outputs.FilesFound, true)
    core.info(`\u001b[1; XXX EARLY ABORT TRUE XXX`)
    return

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-'))
    core.debug(`Temporary path is ${tmpDir}`)

    const artifactClient = artifact.create()
    {
      // download a single artifact
      core.info(`Starting download for "${name}"`)
      const downloadOptions = {
        createArtifactFolder: false
      }
      const downloadResponse = await artifactClient.downloadArtifact(
        name,
        tmpDir,
        downloadOptions
      )
      core.info(
        `Artifact "${downloadResponse.artifactName}" was downloaded to ${downloadResponse.downloadPath}`
      )
    }

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
