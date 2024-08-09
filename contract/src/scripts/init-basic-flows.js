import { makeHelpers } from '@agoric/deploy-script-support';
import { startBasicFlows } from '../proposals/start-basic-flows.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) => {
  return harden({
    sourceSpec: '../proposals/start-basic-flows.js',
    getManifestCall: [
      'getManifestForContract',
      {
        installKeys: {
          basicFlows: publishRef(
            install(
              '../basic-flows.contract.js',
            ),
          ),
        },
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(startBasicFlows.name, defaultProposalBuilder);
};
