import { useAccount } from "wagmi";

import { Account } from "./components/Account";
import { Connect } from "./components/Connect";
import { MintNFT } from "./components/MintNFT";
//import { NetworkSwitcher } from "./components/NetworkSwitcher";

export function BookDapp() {
  const { isConnected, address } = useAccount();

  return (
    <>
      <h1>
        untitled book nft mint (Base Goerli testnet minting) (under
        construction)
      </h1>

      <Connect />

      {isConnected && (
        <>
          <Account />

          <MintNFT userAddress={address} />
        </>
      )}
    </>
  );
}
