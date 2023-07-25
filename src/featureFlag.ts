import * as ld from 'launchdarkly-node-client-sdk';
import { getCurrentBranch } from './gitUtils';

let launchdarklyClient: LaunchdarklyClient;

class LaunchdarklyClient {
  clientId: string;
  client: ld.LDClient;

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  private async initClient() {
    const user: ld.LDUser = {
      key: 'atlassian-frontend',
      custom: {
        branchName: await getCurrentBranch()
      },
    };
    const client = ld.initialize(this.clientId, user, { logger: ld.basicLogger({ level: 'none' }) });
    await client.waitForInitialization();
    this.client = client;
  }

  public async getFeature<T extends string | boolean | number>(flagName: string, defaultResult: T): Promise<T> {
    if (!this.client) {
      await this.initClient();
    }
    
    const result: T = await this.client.variation(flagName, defaultResult);
    await this.client.flush();

    if (!(typeof result === 'boolean' || typeof result === 'string' || typeof result === 'number')) {
      console.log(
        `${flagName} feature flag value (${result}) has invalid type: ${typeof result}. Falling back to default value`,
      );
      return defaultResult;
    }

    return result;
  }
}

function getLaunchdarklyClient(launchdarklyClientId: string) {
  if (launchdarklyClient) {
    return launchdarklyClient;
  } else {
    launchdarklyClient = new LaunchdarklyClient(launchdarklyClientId);
    return launchdarklyClient;
  }
}

export async function getPeerDepCheckFF(launchdarklyClientId: string) {
  try {
    const launchdarklyClient = getLaunchdarklyClient(launchdarklyClientId);
    return launchdarklyClient.getFeature('peer-dependency-enforcement_operational', false);
  } catch(error) {
    console.log(error);
    return false;
  }
}
