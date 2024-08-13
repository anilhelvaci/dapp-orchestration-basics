/**
 * @file A proposal to start the sendAnywhere contract.
 */
import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';


const trace = makeTracer('StartSendAnywhere', true);
const contractName = 'sendAnywhere';


export const startSendAnywhere = async ({
  consume: {
    agoricNames,
    board,
    chainStorage,
    chainTimerService,
    cosmosInterchainService,
    localchain,
    startUpgradable,
  },
  installation: {
    consume: { [contractName]: installation },
  },
  instance: {
    produce: { [contractName]: produceInstance },
  },
}) => {
  trace(`start ${contractName}`);
  await null;

  const storageNode = await makeStorageNodeChild(chainStorage, contractName);
  const marshaller = await E(board).getPublishingMarshaller();

  const startOpts = {
    label: 'sendAnywhere',
    installation,
    terms: undefined,
    privateArgs: {
      agoricNames: await agoricNames,
      orchestrationService: await cosmosInterchainService,
      localchain: await localchain,
      storageNode,
      marshaller,
      timerService: await chainTimerService,
    },
  };

  const { instance } = await E(startUpgradable)(startOpts);
  produceInstance.resolve(instance);
};
harden(startSendAnywhere);

export const getManifestForContract = (
  { restoreRef },
  { installKeys, ...options },
) => {
  return {
    manifest: {
      [startSendAnywhere.name]: {
        consume: {
          agoricNames: true,
          board: true,
          chainStorage: true,
          chainTimerService: true,
          cosmosInterchainService: true,
          localchain: true,
          startUpgradable: true,
        },
        installation: {
          consume: { [contractName]: true },
        },
        instance: {
          produce: { [contractName]: true },
        },
      },
    },
    installations: {
      [contractName]: restoreRef(installKeys[contractName]),
    },
    options,
  };
};
