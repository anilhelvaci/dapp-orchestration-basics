import { makeStateRecord } from '@agoric/async-flow';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { AmountShape } from '@agoric/ertp';
import { M } from '@endo/patterns';
import { prepareChainHubAdmin } from '@agoric/orchestration/src/exos/chain-hub-admin.js';
import { withOrchestration } from '@agoric/orchestration/src/utils/start-helper.js';
import * as flows from '@agoric/orchestration/src/examples/sendAnywhere.flows.js';

export const SingleAmountRecord = M.and(
  M.recordOf(M.string(), AmountShape, {
    numPropertiesLimit: 1,
  }),
  M.not(harden({})),
);

const contract = async (
  zcf,
  _privateArgs,
  zone,
  { chainHub, orchestrateAll, zoeTools },
) => {
  const contractState = makeStateRecord({
    localAccount: undefined,
  });

  const creatorFacet = prepareChainHubAdmin(zone, chainHub);

  const orchFns = orchestrateAll(flows, {
    zcf,
    contractState,
    localTransfer: zoeTools.localTransfer,
  });

  const publicFacet = zone.exo(
    'Send PF',
    M.interface('Send PF', {
      // @ts-ignore
      makeSendInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeSendInvitation() {
        return zcf.makeInvitation(
          orchFns.sendIt,
          'send',
          undefined,
          M.splitRecord({ give: SingleAmountRecord }),
        );
      },
    },
  );

  return { publicFacet, creatorFacet };
};

export const start = withOrchestration(contract);
