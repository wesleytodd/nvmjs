'use strict'
const path = require('path')
const { execFile } = require('child_process')
const fs = require('fs-extra')
const nv = require('@pkgjs/nv')
const semver = require('semver')

// @TODO get things merged to nvm
// const NVM_INSTALL_SRC = 'https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.1/install.sh'
const NVM_INSTALL_SRC = 'https://raw.githubusercontent.com/wesleytodd/nvm/wip/install.sh'
const NVM_SRC = 'https://github.com/wesleytodd/nvm.git'

module.exports.NVM = class NVM {
  constructor (opts = {}) {
    this._installed = false

    this.env = env(opts.env)
    this.nvmSrc = opts.nvmSrc || NVM_SRC
    this.nvmInstallSrc = opts.nvmInstallSrc || NVM_INSTALL_SRC
    this.nvmDirectory = opts.nvmDirectory || path.join(__dirname, '.nvm')
    this.nvmBin = opts.nvmBin || path.join(__dirname, 'bin', 'nvm')
    this.nvmInstallBin = opts.nvmInstallBin || path.join(__dirname, 'bin', 'install')
    this.nvmSearchDirectories = opts.nvmSearchDirectories || [
      opts.nvmDirectory,
      process.env.NVM_DIR,
      this.nvmDirectory
    ].filter((v) => typeof v !== 'undefined')
  }

  async findExistingNvm () {
    // Find existing nvm installs
    const found = await this.nvmSearchDirectories.reduce(async (p, dir) => {
      // Already found or dir is falsy
      const found = await p
      if (found || !dir) {
        return found
      }

      // Try to get the installed nvm version
      const ver = await this.version({
        env: {
          NVM_DIR: dir
        }
      })
      if (ver) {
        return [dir, ver]
      }
    }, Promise.resolve(false))

    return found || [null, null]
  }

  installNvm () {
    if (this._installed) {
      return this._installed
    }

    this._installed = new Promise((resolve, reject) => {
      const dir = this.nvmDirectory
      fs.ensureDir(dir).then(() => {
        execFile(this.nvmInstallBin, [], {
          shell: '/bin/bash',
          env: {
            ...this.env,
            NVM_DIR: dir,
            // Change the install script source
            NVM_SOURCE: this.nvmSrc,
            // @TODO https://github.com/nvm-sh/nvm/pull/2132
            PROFILE: '/dev/null',
            // @TODO https://github.com/nvm-sh/nvm/pull/2132
            NVM_NOUSE: 'true'
          }
        }, async (err, stdout, stderr) => {
          if (err) {
            return reject(err)
          }
          const ver = await this.version({
            env: {
              NVM_DIR: dir
            }
          })
          if (!ver) {
            return reject(new Error(`failed to install: ${dir}`))
          }

          resolve([dir, ver])
        })
      }, reject)
    })

    return this._installed
  }

  nvm (args = [], opts = {}) {
    return run(this, args, opts)
  }

  async install (version, opts = {}) {
    const v = (await nv(version)).pop()
    const o = await run(this, ['install', (v && v.version) || version], opts)

    // Parse out versions
    const m = o.stdout.match(/Now using node (v[0-9]+\.[0-9]+\.[0-9]+) \(npm (v[0-9]+\.[0-9]+\.[0-9]+)\)/)
    const nodeVer = semver.parse(m[1])
    const npmVer = semver.parse(m[2])

    // Bin path
    const bin = await this.which(nodeVer.version)

    return Object.assign(o, {
      node: {
        path: bin,
        version: nodeVer.version,
        major: nodeVer.major,
        minor: nodeVer.minor,
        patch: nodeVer.patch
      },
      npm: npmVer
    })
  }

  async installNpm (version, opts = {}) {
    // @TODO
  }

  async run (_args, opts = {}) {
    const args = [
      'run',
      (opts.silent) ? '--silent' : '',
      opts.node || 'current',
      ..._args
    ]
    return run(this, args, opts)
  }

  async exec (_args, opts = {}) {
    const args = [
      'exec',
      (opts.silent) ? '--silent' : '',
      opts.node || 'current',
      ..._args
    ]
    return run(this, args, opts)
  }

  async version (opts) {
    try {
      const { stdout } = await run(this, ['--version'], opts)
      return stdout.trim()
    } catch (e) {
      /* ignore */
    }
    return null
  }

  async which (version, opts = {}) {
    try {
      const { stdout } = await run(this, ['which', version || 'current'], opts)
      return stdout.trim()
    } catch (e) {
      /* ignore */
    }
    return null
  }

  async current (opts) {
    try {
      const { stdout } = await run(this, ['current'], opts)
      return stdout.trim()
    } catch (e) {
      console.loe(e)
      /* ignore */
    }
    return null
  }
}

function env (overrides = {}) {
  const env = process.env
  return Object.keys(env).reduce((e, key) => {
    if (key.startsWith('npm_') || key.startsWith('NVM_') || env[key] === undefined) {
      return e
    }
    e[key] = e[key] || env[key]
    return e
  }, { ...overrides })
}

function run (nvm, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const cp = execFile(nvm.nvmBin, args, {
      ...opts,
      env: env({
        ...nvm.env,
        ...(opts.env || {}),
        NVM_DIR: nvm.nvmDirectory
      })
    }, (err, stdout, stderr) => {
      const o = {
        error: err,
        exitCode: cp.exitCode,
        stdout: stdout,
        stderr: stderr
      }
      if (err && opts.rejectOnError !== false) {
        Error.captureStackTrace(err, run)
        Object.assign(err, o)
        return reject(err)
      }
      resolve(o)
    })
  })
}
