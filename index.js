#!/usr/bin/env node
'use strict'

const { promises: fs } = require('fs')
const readdirp = require('readdirp')
const { dirname, basename, resolve } = require('path')
const semver = require('semver')
const { titleCase } = require('title-case')

const main = async () => {
  let contributors
  try {
    const rc = JSON.parse(
      await fs.readFile('.all-contributorsrc', {
        encoding: 'utf8'
      })
    )
    contributors = rc.contributors
  } catch (_) {}

  console.log(
    "<!-- This document was automatically generated through `credit-roll`. Please don't edit it directly. -->"
  )
  console.log()
  console.log('# Credits')
  console.log()
  console.log(
    'This project is made possible by the community surrounding it and especially the wonderful people and projects listed in this document.'
  )
  console.log()

  if (contributors) {
    console.log('## Contributors')
    console.log()
    for (const { login, name } of contributors) {
      console.log(`  - [${name}](https://github.com/${login})`)
    }
    console.log()
  }

  for (const file of process.argv.slice(2)) {
    const absolutePath = resolve(process.cwd(), file)
    const data = require(absolutePath)
    const section = basename(file, '.json')

    console.log(`## ${titleCase(section)}`)
    console.log()
    for (const { name } of data) {
      console.log(`  - ${name}`)
    }
    console.log()
  }

  console.log('## Libraries')
  console.log()

  const entries = await readdirp.promise('node_modules', {
    fileFilter: 'package.json'
  })
  const pkgs = {}
  for (const entry of entries) {
    const entryBuffer = await fs.readFile(entry.fullPath)
    let pkg
    try {
      pkg = JSON.parse(entryBuffer)
    } catch (err) {
      //malformed JSON, skip this entry
      continue
    }
    if (!pkg.version) continue
    pkg.fullPath = entry.fullPath
    if (!pkgs[pkg.name] || semver.lt(pkgs[pkg.name].version, pkg.version)) {
      pkgs[pkg.name] = pkg
    }
  }

  for (const pkgName of Object.keys(pkgs).sort()) {
    const pkg = pkgs[pkgName]
    const licenseName =
      pkg.license ||
      (pkg.licenses && pkg.licenses.map(({ type }) => type).join(', '))
    let licenseText
    for await (const licenseEntry of readdirp(`${dirname(pkg.fullPath)}`, {
      fileFilter: e => /^license/i.test(e.basename)
    })) {
      licenseText = await fs.readFile(licenseEntry.fullPath, {
        encoding: 'utf8'
      })
      break
    }
    if (!licenseName && !licenseText) continue

    console.log(`### [${pkg.name}](https://ghub.io/${pkg.name})`)
    console.log()
    if (licenseText) {
      console.log('<details>')
      console.log(`  <summary>${licenseName || 'UNKNOWN LICENSE'}</summary>`)
      console.log()
      console.log(
        (licenseText || 'UNKNOWN LICENSE TEXT').replace(/^/gm, '    ')
      )
      console.log()
      console.log('</details>')
    } else {
      console.log(licenseName || 'UNKNOWN LICENSE')
    }
    console.log()
  }
  console.log()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
