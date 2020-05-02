# Node Version Mananger (JS wrapper for nvm)

[![NPM Version](https://img.shields.io/npm/v/nvmjs.svg)](https://npmjs.org/package/nvmjs)
[![NPM Downloads](https://img.shields.io/npm/dm/nvmjs.svg)](https://npmjs.org/package/nvmjs)
[![test](https://github.com/wesleytodd/nvmjs/workflows/Test/badge.svg)](https://github.com/wesleytodd/nvmjs/actions?query=workflow%3ATest)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/standard/standard)

A wrapper around nvm with to interact via a JavaScript interface.

*NOTE: This is a WIP, contributions are welcome so please open PRs if your feature is not implemented yet.*

## Usage

```
$ npm i nvmjs
```

```javascript
const { NVM } = require('nvmjs')

const nvm = new NVM({
  // For now only works with this fork, pending some PRs
  // Thsese will be default until then
  nvmInstallSrc: 'https://raw.githubusercontent.com/wesleytodd/nvm/wip/install.sh',
  nvmSrc: 'https://github.com/wesleytodd/nvm.git',

  nvmDirectory: process.env.NVM_DIR,
  nvmSearchDirectories: [
    // Checks this first if passed
    // opts.nvmDirectory,

    // If globally installed, will use it
    // process.env.NVM_DIR,

    // Checks this last (will install inside the module dir)
    // path.join(__dirname, .nvm)
  ],
  env: {
    // Set env vars to be used when calling nvm
  }
})

// Install nvm to opts.nvmDirectory
const [dir, ver] = await nvm.installNvm()

// Find installs based on opts.nvmSearchDirectories
const [dir, ver] = await nvm.findExistingNvm()

// Install a node versions, defaults to lts_active
const ver = await nvm.install(/* version: 14, 14.0.0, lts_active */)
console.log(ver)
/*
{
  exitCode: 0,
  stdout: '...',
  stderr: '...',
  node: {
    path: '~/.nvm/versions/node/v14.1.0/bin/node',
    version: '14.1.0',
    major: 14,
    minor: 1,
    patch: 0
  },
  npm: {
    version: '6.14.4',
    major: 6,
    minor: 14,
    patch: 4
  }
}
*/

// Run with nvm
const { stdout } = await nvm.run(['-e', 'console.log(process.version)'], {
  // Surpress nvm output
  silent: true,
  version: '14' // accepts all aliases
})

// Exec with nvm
const { stdout } = await nvm.exec(['node', '-e', 'console.log(process.version)'], {
  // Surpress nvm output
  silent: true,
  version: '14' // accepts all aliases
})

//
// Other helper methods
//

// which node version, returns path to node
await nvm.which(/* optional version */)

// Return current node version
await nvm.current()

// Return version of nvm
await nvm.version()

// Run arbitrary nvm command
await nvm.nvm(['ls'])
await nvm.nvm(['use', '14'])
await nvm.nvm(['cache', 'dir'])
```
