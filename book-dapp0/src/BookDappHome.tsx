//import { useState } from "react";
import "./App.css";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultWallets, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { mainnet, polygon, optimism, arbitrum, base, zora } from "wagmi/chains";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";

function BookDappHome() {
  return (
    <>
      <h1>book dapp</h1>
      <p style={{ maxWidth: "400px" }}>
        [name] is a non-fungible token that contains an image of a book that is
        generated directly on-chain. Each book is imprinted with a random{" "}
        <a href="https://en.wikipedia.org/wiki/List_of_Unicode_characters">
          unicode
        </a>{" "}
        symbol on the cover and exhibits other random properties.
      </p>
      <p>
        The project is intended examine the nuances behind the meaning of
        "on-chain", particularly at the edge where boundaries can be blurry. For
        instance, the set of supported unicode symbols can fluctuate over time
        as standards evolve. Many of these are reserved for future use, implying
        that even if the symbol is "on-chain", it is not necessarily
        "immutable". A book that currently has a blank cover, or a generic
        rectangle can suddenly spawn a brand new symbol.
      </p>
      <p>
        We draw attention to the implicit trust placed in ambient technologies
        and groups that work behind the scenes, such as the unicode consortium,
        the SVG standards, browser behaviour, font support and so on.
      </p>
      <p>
        The project is deployed on Base in order to be able to take advantage of
        cheap gas fees for possible future dapp interactions, depending on the
        success of the project and funding opportunities.
      </p>
      <p>
        For important project updates, follow Blue Green crypto at{" "}
        <a href="https://twitter.com/bluegreen3000">@bluegreen3000</a>
      </p>
      <p>
        This digital asset is for artistic and entertainment purposes only and
        there is absolutely no guarantee of ongoing project evolution or
        financial gains
      </p>
    </>
  );
}

export default BookDappHome;
