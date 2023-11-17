import { useAccount } from "wagmi";
import { useState } from "react";

import { Account } from "./components/Account";
import { Connect } from "./components/Connect";
import { MintNFT } from "./components/MintNFT";
//import { NetworkSwitcher } from "./components/NetworkSwitcher";
import { bookNftAddress } from "./modules/Contract";

export function BookDapp() {
  const { isConnected, address } = useAccount();
  const [viewAbout, setViewAbout] = useState(false);
  const [viewHow, setViewHow] = useState(false);
  const [viewMint, setViewMint] = useState(false);

  return (
    <>
      {" "}
      <h1>
        untitled book nft mint (Sepolia testnet minting) (under
        construction)
      </h1>
      <a
        className="nav"
        href="#"
        onClick={() => {
          setViewAbout(!viewAbout);
        }}
      >
        <>About</>
        {viewAbout && <> (close)</>}
      </a>
      <Connect />
      {viewAbout && (
        <div style={{ maxWidth: "50%" }}>
          <p>
            UNTITLED BOOK CLUB is a non-fungible token that contains an image of
            a book that is generated directly on-chain. Each book is imprinted
            with a random{" "}
            <a href="https://en.wikipedia.org/wiki/List_of_Unicode_characters">
              unicode
            </a>{" "}
            symbol on the cover and exhibits other random traits.
          </p>
          <p>
            The project examines the nuances behind the meaning of "on-chain",
            particularly at the edge where boundaries can be blurry. For
            instance, the set of supported unicode symbols can fluctuate over
            time as standards evolve. Many of these are reserved for future use,
            implying that even if the symbol is "on-chain", it is not
            necessarily "immutable". A book that currently has a blank cover, or
            a generic rectangle can suddenly spawn a brand new symbol.
          </p>
          <p>
            We draw attention to the implicit trust placed in ambient
            technologies and groups that work behind the scenes, such as the
            unicode consortium, the SVG standards, browser differences, font
            support and so on.
          </p>
          <p>
            For important project updates, follow Blue Green crypto at{" "}
            <a href="https://twitter.com/bluegreen3000">@bluegreen3000</a>
          </p>
          <p style={{ fontWeight: "bold" }}>
            Purchasing or minting this digital object is for artistic and
            entertainment purposes only and there is absolutely no guarantee of
            ongoing project evolution or re-sale gains. The contract has not
            been audited and is provided as-is. The project is not affiliated
            with any other project or organization.
          </p>
        </div>
      )}
      {!viewMint && isConnected && (
        <div>
          <a
            className="nav"
            href="#"
            onClick={() => {
              setViewMint(!viewMint);
            }}
          >
            Mint
          </a>
        </div>
      )}
      {viewMint && isConnected && (
        <>
          <MintNFT userAddress={address} />
        </>
      )}
      <br />
      <br />
      <h4>
        contract address:{" "}
        <a
          href={`https://goerli.basescan.org/address/${bookNftAddress}`}
          target="_blank"
        >
          {" "}
          {bookNftAddress}
        </a>
      </h4>
    </>
  );
}
