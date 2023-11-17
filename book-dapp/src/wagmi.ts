import { configureChains, createConfig } from "wagmi";
import { goerli, mainnet, baseGoerli, base, hardhat, sepolia } from "@wagmi/chains";
import { CoinbaseWalletConnector } from "wagmi/connectors/coinbaseWallet";
import { InjectedConnector } from "wagmi/connectors/injected";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";

import { publicProvider } from "wagmi/providers/public";
import { infuraProvider } from 'wagmi/providers/infura'

const walletConnectProjectId = "cbe5c80a64e44dbb62d665b0d0ed452b";

const { chains, publicClient, webSocketPublicClient } = configureChains(
  //[hardhat],
  [sepolia],
  //  [base, ...(import.meta.env?.MODE === "development" ? [baseGoerli] : [])],
  [publicProvider(), infuraProvider({ apiKey: '48bef4877af34063ac44f6cacf41c36a' })]
);

export const config = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: "wagmi",
      },
    }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: walletConnectProjectId,
      },
    }),
    new InjectedConnector({
      chains,
      options: {
        name: "Injected",
        shimDisconnect: true,
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
});
