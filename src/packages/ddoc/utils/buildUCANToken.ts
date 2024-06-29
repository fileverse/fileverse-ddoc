import * as ucans from 'ucans';

export const buildUCANToken = async (tempAuth: ucans.EdKeypair) => {
  const t = await tempAuth.export();
  console.log({ t });
  const ucan = await ucans.build({
    audience: 'did:key:z6MkrrWQ11DoCzkLzoDuDnCszbwZZra3PmF62joDeMbpgCFD', // Should have DIDs from backend service
    issuer: tempAuth,
    lifetimeInSeconds: 7 * 86400,
    capabilities: [
      {
        with: {
          scheme: 'storage',
          hierPart: 'collaboration'
        },
        can: {
          namespace: 'file',
          segments: ['CREATE', 'GET']
        }
      }
    ]
  });

  return ucans.encode(ucan);
};
