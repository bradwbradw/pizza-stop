import { useEffect, useState } from "react";
import { useWaitForTransaction } from "wagmi";
import { _ } from "lodash";
import { readContract } from "@wagmi/core";

import {
  useNetwork,
  useContractRead,
  useContractWrite,
  //  UseContractWriteConfig,
  usePrepareContractWrite,
  useContractEvent,
} from "wagmi";

import { bookNftABI, bookNftAddress } from "../modules/Contract";

function bookCollection(ids) {
  var p = Promise.resolve();
  var results = [];
  _.each(ids, (id) => {
    p = p.then(() => {
      return readContract({
        abi: bookNftABI,
        address: bookNftAddress,
        functionName: "tokenURI",
        args: [id.toString()],
      })
        .then((data) => {
          return fetch(data);
        })
        .then((data) => data.json())
        .then((data) => {
          results.push(data);
          return true;
        });
    });
  });

  return p.then(() => {
    return results;
  });
}

export function MintNFT({ userAddress }) {
  const { chain } = useNetwork();
  const [numberToMint, setNumberToMint] = useState(1);
  const [mintPrice, setMintPrice] = useState(null);
  const [collection, setCollection] = useState(null);
  const [focused, setFocused] = useState(null);

  const { error: prepareError, isError: isPrepareError } =
    usePrepareContractWrite({
      abi: bookNftABI,
      address: bookNftAddress,
      functionName: "Mint",
      args: [numberToMint],
    });
  const { data, error, isError, write } = useContractWrite({
    abi: bookNftABI,
    address: bookNftAddress,
    functionName: "Mint",
    args: [numberToMint],
  });
  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  const mintPriceRead = useContractRead({
    abi: bookNftABI,
    address: bookNftAddress,
    functionName: "getPrice",
    args: [numberToMint],
  });

  const { data: ownedNFTs } = useContractRead({
    abi: bookNftABI,
    address: bookNftAddress,
    functionName: "tokensOfOwner",
    args: [userAddress],
  });

  useEffect(() => {
    bookCollection([...ownedNFTs]).then((books) => {
      setCollection(books);
      console.log("just set books", books);
    });
  }, [isLoading, ownedNFTs?.data?.length]);

  useEffect(() => {
    if (mintPriceRead?.data) {
      // convert BigInt to number

      setMintPrice(mintPriceRead?.data);
    } else {
      console.log("no mpr", mintPriceRead.data);
    }
  }, [mintPriceRead?.data]);

  return (
    <div>
      <h3>contract address: {bookNftAddress}</h3>
      <label>
        Number to mint:
        <input
          type="number"
          value={numberToMint}
          onChange={(event) => {
            setNumberToMint(event.target.value);
          }}
        ></input>
        Minting {numberToMint} will cost {mintPrice} Eth
      </label>
      <button disabled={!write || isLoading} onClick={() => write?.()}>
        {isLoading ? "Minting..." : "Mint"}
      </button>
      {isSuccess && (
        <div>
          Successfully minted your NFT!
          <div>
            <a href={`https://etherscan.io/tx/${data?.hash}`}>Etherscan</a>
          </div>
        </div>
      )}
      {(isPrepareError || isError) && (
        <div style={{ color: isPrepareError ? "orange" : "red" }}>
          Error: {(prepareError || error)?.message}
        </div>
      )}
      <br />
      {!collection ? (
        <>your book collection is loading...</>
      ) : (
        <>
          <br />
          <br />
          my library:
          <div style={{ display: "flex" }}>
            {collection.map((item) => {
              return (
                <div
                  class="spineImage"
                  key={item.name}
                  style={{
                    position: "relative",
                  }}
                  onClick={() => {
                    setFocused(item);
                  }}
                >
                  {/*}
                <pre>{JSON.stringify(item[1], null, 2)}</pre>
                {*/}
                  <img
                    src={item.spineImage}
                    style={{
                      height: "300px",
                      width: "auto",
                    }}
                  />
                </div>
              );
            })}
          </div>
          {focused && (
            <>
              <img src={focused.image} />
              <pre>{JSON.stringify(focused, null, 2)}</pre>
            </>
          )}
        </>
      )}
    </div>
  );
}
