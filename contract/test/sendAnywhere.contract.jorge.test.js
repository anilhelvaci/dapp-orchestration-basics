import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';
import { commonSetup } from './tools/supports.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import { registerChain } from '@agoric/orchestration/src/chain-info.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractName = 'sendAnywhere';
const contractFile = `${dirname}/../src/${contractName}.contract.js`;

const chainName = 'hot';

const hotChainInfo = harden({
  chainId: 'hot-new-chain-0',
  stakingTokens: [{ denom: 'uhot' }],
  connections: {},
});

const agoricToHotConnection = {
  id: 'connection-1',
  client_id: '07-tendermint-1',
  state: 3, // STATE_OPEN
  counterparty: {
    client_id: '07-tendermint-2109',
    connection_id: 'connection-1649',
    prefix: {
      key_prefix: 'aWJj',
    },
  },
  transferChannel: {
    counterPartyChannelId: 'channel-1',
    channelId: 'channel-0',
    counterPartyPortId: 'transfer',
    version: 'ics20-1',
    portId: 'transfer',
    ordering: 1, // ORDER_UNORDERED
    state: 3, // STATE_OPEN,
  },
};

test.before(async t => {
  t.log('bootstrap, orchestration core-eval');
  const { bootstrap, commonPrivateArgs, brands, utils } = await commonSetup(t);

  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  const installation = await bundleAndInstall(contractFile);
  const storageNode = await E(bootstrap.storage.rootNode).makeChildNode(
    contractName,
  );

  const sendKit = await E(zoe).startInstance(
    installation,
    { Stable: brands.ist.issuer }, // TODO: understand why this is needed
    {},
    { ...commonPrivateArgs, storageNode },
  );

  t.context = {
    zoe,
    sendKit,
    bootstrap,
    brands,
    utils,
  };
});

test.serial('test that agoricNames is NOT updated with initChain', async t => {
  const {
    sendKit,
    bootstrap: { agoricNames },
  } = t.context;

  await E(sendKit.creatorFacet).initChain(
    chainName,
    hotChainInfo,
    agoricToHotConnection,
  );

  const chains = await E(await E(agoricNames).lookup('chain')).values();
  const found = chains.some(chain => chain.chainId === 'hot-new-chain-0');

  t.is(found, false);
});

test.serial('test that agoricNames is updated with registerChain', async t => {
  const {
    bootstrap: { agoricNames, agoricNamesAdmin },
  } = t.context;

  await registerChain(
    agoricNamesAdmin,
    'hot-new-chain',
    // @ts-ignore
    harden({
      ...hotChainInfo,
      connections: { 'agoric-3': agoricToHotConnection },
    }),
  );

  const chains = await E(await E(agoricNames).lookup('chain')).values();
  const found = chains.some(chain => chain.chainId === 'hot-new-chain-0');

  t.is(found, true);
});

// The contract should not accept an empty destAddr, although it does-
test.serial('test send it to an empty destAddr', async t => {
  const { zoe, sendKit, brands, utils, bootstrap } = t.context;

  const invitation = await E(sendKit.publicFacet).makeSendInvitation();
  const sendAmount = brands.ist.units(1);
  const Send = await utils.pourPayment(sendAmount);

  const userSeat = await E(zoe).offer(
    invitation,
    { give: { Send: sendAmount } },
    { Send },
    { destAddr: '', chainName },
  );

  await utils.transmitTransferAck();
  await bootstrap.vowTools.when(E(userSeat).getOfferResult());

  const history = utils.inspectLocalBridge();
  t.like(history, [
    { type: 'VLOCALCHAIN_ALLOCATE_ADDRESS' },
    { type: 'VLOCALCHAIN_EXECUTE_TX' },
  ]);

  const [_alloc, { messages, address: execAddr }] = history;
  t.is(messages.length, 1);

  const [txfr] = messages;
  t.like(txfr, {
    '@type': '/ibc.applications.transfer.v1.MsgTransfer',
    memo: '',
    receiver: '',
    sender: execAddr,
    sourceChannel: 'channel-0',
    sourcePort: 'transfer',
    timeoutHeight: {
      revisionHeight: 0n,
      revisionNumber: 0n,
    },
    timeoutTimestamp: 300000000000n,
    token: { amount: '1000000', denom: 'uist' },
  });
});

test.serial('test try to send it to an unknown chain', async t => {
  const { zoe, sendKit, brands, utils, bootstrap } = t.context;

  const invitation = await E(sendKit.publicFacet).makeSendInvitation();
  const sendAmount = brands.ist.units(1);
  const Send = await utils.pourPayment(sendAmount);

  const userSeat = await E(zoe).offer(
    invitation,
    { give: { Send: sendAmount } },
    { Send },
    { destAddr: 'hot1destAddr', chainName: 'random' },
  );

  const offerResult = bootstrap.vowTools.when(E(userSeat).getOfferResult());

  const error = await t.throwsAsync(offerResult);
  t.is(error.message, 'chain not found:random');
});

/*
 * How to access the chainHub provided to the contract?
 *
 * When starting the contract, the chainHub that is provided in the parameters as a tool,
 * is also provided to the orchestrateKit.
 * Meaning that the orchestrator object used in the sendAnywhere flow is able to query
 * the chain info from the local chainHub provided to the contract and exposed in the creator facet.
 *
 * Although, I cant see a way to do reach that object, considering that this specific contract did not
 * provide any expose method to access it.
 *
 * Note: is there any scenario where an user/developer would require this feature anyway?
 */
test.skip('test how to fetch chain info after using initChain ', async t => {});
