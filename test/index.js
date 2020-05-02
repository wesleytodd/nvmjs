'use strict'
const { suite, test, beforeEach, before } = require('mocha')
const assert = require('assert')
const path = require('path')
const { exec } = require('child_process')
const fs = require('fs-extra')
const nv = require('@pkgjs/nv')
const pkg = require('../package.json')
const { NVM } = require('..')

const TMP = path.join(__dirname, '__TMP')
const NVM_DIR = path.join(TMP, '.nvm')
async function cleanNvm () {
  try {
    await fs.remove(NVM_DIR)
  } catch (e) { /* ignore */ }
}
async function cleanNode () {
  try {
    await fs.remove(path.join(NVM_DIR, 'versions'))
  } catch (e) { /* ignore */ }
  try {
    await fs.remove(path.join(NVM_DIR, 'alias'))
  } catch (e) { /* ignore */ }
}

let DEFAULT_PATH
function getDefaultPath (cb) {
  return new Promise((resolve) => {
    exec('getconf PATH', (err, stdout, stderr) => {
      DEFAULT_PATH = err ? '/usr/bin:/bin:/usr/sbin:/sbin' : stdout.trim()
      resolve()
    })
  })
}

let n
function setupNVMInstance () {
  n = new NVM({
    nvmInstallSrc: 'https://raw.githubusercontent.com/wesleytodd/nvm/wip/install.sh',
    nvmSrc: 'https://github.com/wesleytodd/nvm.git',
    nvmDirectory: NVM_DIR,
    nvmSearchDirectories: [NVM_DIR],
    env: {
      PATH: DEFAULT_PATH
    }
  })
}

suite(pkg.name, function () {
  this.timeout(0)

  before(async () => {
    await getDefaultPath()
  })

  suite('nvm', () => {
    before(async () => {
      await cleanNvm()
      setupNVMInstance()
    })

    test('not find when not installed', async function () {
      const [dir, ver] = await n.findExistingNvm()
      assert.strictEqual(dir, null)
      assert.strictEqual(ver, null)
    })

    test('install', async function () {
      const [dir, ver] = await n.installNvm()
      assert.strictEqual(dir, NVM_DIR)
      // @TODO automate this version stuff
      assert.strictEqual(ver, '0.35.2')
    })

    test('find existing install', async function () {
      // Ensure works on re-install
      const [dir, ver] = await n.findExistingNvm()
      assert.strictEqual(dir, NVM_DIR)
      // @TODO automate this version stuff
      assert.strictEqual(ver, '0.35.2')
    })

    test('find an existing install and not re-install', async function () {
      const [dir, ver] = await n.installNvm()
      assert.strictEqual(dir, NVM_DIR)
      // @TODO automate this version stuff
      assert.strictEqual(ver, '0.35.2')
    })
  })

  suite('node versions', () => {
    beforeEach(async () => {
      setupNVMInstance()
      await n.installNvm()
      await cleanNode()
    })

    test('install major (14)', async () => {
      // Install specific major
      const ver = await n.install(14)
      assert.strictEqual(ver.exitCode, 0)
      assert.strictEqual(ver.node.major, 14)
      assert.strictEqual(typeof ver.npm, 'object')
      assert.strictEqual(ver.node.path, path.join(NVM_DIR, 'versions', 'node', `v${ver.node.version}`, 'bin', 'node'))
    })

    test('install specific version (12.16.3)', async () => {
      const nVer = await n.install('12.16.3')
      assert.strictEqual(nVer.exitCode, 0)
      const ver = (await nv('v12.16.3')).pop()
      assert.strictEqual(nVer.node.major, ver.major)
      assert.strictEqual(nVer.node.path, path.join(NVM_DIR, 'versions', 'node', `v${nVer.node.version}`, 'bin', 'node'))
    })

    test('install alias (lts_active)', async () => {
      const nLtsActive = await n.install('lts_active')
      assert.strictEqual(nLtsActive.exitCode, 0)
      const ltsActive = (await nv('lts_active')).pop()
      assert.strictEqual(nLtsActive.node.major, ltsActive.major)
      assert.strictEqual(nLtsActive.node.path, path.join(NVM_DIR, 'versions', 'node', `v${nLtsActive.node.version}`, 'bin', 'node'))
    })

    test('which (12, 12.16.3, lts_active, current)', async function () {
      const none = await n.which()
      assert.strictEqual(none, null)

      const twelve = await n.install(12)
      const nCurrent = await n.which()
      assert.strictEqual(nCurrent, path.join(NVM_DIR, 'versions', 'node', `v${twelve.node.version}`, 'bin', 'node'))

      const n12 = await n.which(12)
      assert.strictEqual(n12, path.join(NVM_DIR, 'versions', 'node', `v${twelve.node.version}`, 'bin', 'node'))

      const twelveSixteenThree = await n.install('12.16.3')
      const n12163 = await n.which('12.16.3')
      assert.strictEqual(n12163, path.join(NVM_DIR, 'versions', 'node', `v${twelveSixteenThree.node.version}`, 'bin', 'node'))
    })

    test('exec with a current', async function () {
      const ver = await n.install()
      const out = await n.exec(['node', '-e', 'console.log(process.version)'], {
        silent: true
      })
      assert.strictEqual(out.stdout.trim(), `v${ver.node.version}`)
    })

    test('exec with a version (14)', async function () {
      const ver = await n.install(14)
      const out = await n.exec(['node', '-e', 'console.log(process.version)'], {
        silent: true,
        node: 14
      })
      assert.strictEqual(out.stdout.trim(), `v${ver.node.version}`)
    })

    test('run with a current', async function () {
      const ver = await n.install()
      const out = await n.run(['-e', 'console.log(process.version)'], {
        silent: true
      })
      assert.strictEqual(out.stdout.trim(), `v${ver.node.version}`)
    })

    test('run with a version (14)', async function () {
      const ver = await n.install(14)
      const out = await n.run(['-e', 'console.log(process.version)'], {
        silent: true,
        node: 14
      })
      assert.strictEqual(out.stdout.trim(), `v${ver.node.version}`)
    })

    test('current', async function () {
      const ver = await n.install(14)
      const out = await n.current()
      assert.strictEqual(out, `v${ver.node.version}`)
    })
  })
})
