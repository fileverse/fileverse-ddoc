import * as encoding from "lib0/encoding";
import { SocketClient } from "../socketClient";
import * as awarenessProtocol from "y-protocols/awareness";

export const createAwarenessUpdateHandler = (
  awareness: any,
  socketClient: SocketClient | null,
  isConnected: boolean,
) => {
  return ({ added, updated, removed }: any) => {
    const changedClients = added.concat(updated).concat(removed);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
    );
    if (isConnected && socketClient) {
      socketClient.broadcastAwareness(encoding.toUint8Array(encoder));
    }
  };
};
