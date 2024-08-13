import { makeHelpers } from '@agoric/deploy-script-support';
import { startSendAnywhere } from '../proposals/start-sendAnywhere.js'; 

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) => {
  return harden({
    sourceSpec: '../proposals/start-sendAnywhere.js',
    getManifestCall: [
      'getManifestForContract',
      {
        installKeys: {
          basicFlows: publishRef(
            install(
              '../sendAnywhere.contract.js',
            ),
          ),
        },
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(startSendAnywhere.name, defaultProposalBuilder);
};
