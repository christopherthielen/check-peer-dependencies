import * as child_process from 'child_process';
import * as util from 'util';

const exec = util.promisify(child_process.exec);

export async function getCurrentBranch() {
  try {
    const output = await exec('git rev-parse --abbrev-ref HEAD');
    return output.stdout.trim();
  } catch(error) {
    console.log(error)
    return ''
  }
}
