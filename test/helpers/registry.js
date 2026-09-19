const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const semver = require('semver');
const { npm } = require('./command');

async function findPackages(directory) {
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(directory, 'package.json'), 'utf8'));
    return [{ directory, manifest }];
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const nested = await Promise.all(
    entries.filter((entry) => entry.isDirectory()).map((entry) => findPackages(path.join(directory, entry.name)))
  );
  return nested.flat();
}

async function startRegistry(fixture, directory) {
  const packages = new Map();
  for (const source of [path.join(fixture, 'packages'), path.join(fixture, 'registry')]) {
    for (const entry of await findPackages(source)) {
      const { name, version } = entry.manifest;
      assert.ok(name && semver.valid(version), `Invalid fixture package: ${entry.directory}`);
      const versions = packages.get(name) || new Map();
      assert.ok(!versions.has(version), `Duplicate fixture package: ${name}@${version}`);
      versions.set(version, entry);
      packages.set(name, versions);
    }
  }

  const metadata = new Map();
  const tarballs = new Map();
  const requests = [];
  let url;
  async function describe(name) {
    const versions = {};
    for (const [version, entry] of packages.get(name)) {
      const destination = await fs.mkdtemp(path.join(directory, 'tarball-'));
      // npm creates portable archives and includes the same files it would publish.
      const packed = await npm(['pack', '--ignore-scripts', '--json', '--pack-destination', destination], {
        cwd: entry.directory,
        logFile: path.join(directory, 'registry.log'),
      });
      assert.equal(packed.exitCode, 0, packed.output);
      const [info] = JSON.parse(packed.stdout);
      const id = String(tarballs.size);
      tarballs.set(id, await fs.readFile(path.join(destination, info.filename)));
      versions[version] = {
        ...entry.manifest,
        _id: `${name}@${version}`,
        dist: { tarball: `${url}/tarballs/${id}`, shasum: info.shasum, integrity: info.integrity },
      };
    }
    const ordered = semver.rsort(Object.keys(versions));
    const latest = ordered.find((version) => !semver.prerelease(version)) || ordered[0];
    return { name, 'dist-tags': { latest }, versions };
  }

  const server = http.createServer(async (request, response) => {
    requests.push({ method: request.method, url: request.url });
    try {
      const pathname = decodeURIComponent(new URL(request.url, url).pathname);
      if (pathname.startsWith('/tarballs/')) {
        const tarball = tarballs.get(pathname.slice('/tarballs/'.length));
        if (tarball) {
          response.writeHead(200, { 'content-type': 'application/octet-stream' });
          response.end(tarball);
          return;
        }
      }
      const name = pathname.slice(1);
      response.setHeader('content-type', 'application/json');
      if (request.method !== 'GET' || !packages.has(name)) {
        response.writeHead(404);
        response.end(JSON.stringify({ error: 'Fixture package not found', name }));
        return;
      }
      if (!metadata.has(name)) metadata.set(name, describe(name));
      response.end(JSON.stringify(await metadata.get(name)));
    } catch (error) {
      response.writeHead(500);
      response.end(JSON.stringify({ error: error.message }));
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  url = `http://127.0.0.1:${server.address().port}`;
  return {
    url,
    async close() {
      await new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      });
      await fs.writeFile(path.join(directory, 'registry-requests.json'), JSON.stringify(requests, null, 2));
    },
  };
}

module.exports = { startRegistry };
