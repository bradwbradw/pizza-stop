import { useEffect, useState } from "react";
import { useWaitForTransaction } from "wagmi";
import { formatEther } from "viem";
import { _ } from "lodash";
import { readContract, writeContract, watchContractEvent } from "@wagmi/core";
//import { Draggable } from "react-reorder-draggable";
import Library from "./Library.jsx";

import {
  useNetwork,
  useContractRead,
  useContractWrite,
  //  UseContractWriteConfig,
  usePrepareContractWrite,
  useContractEvent
} from "wagmi";

import { bookNftABI, bookNftAddress } from "../modules/Contract";
import SymbolChanger from "./SymbolChanger";
import Persistence from "../modules/Persistence";
import findReasonString from "../modules/FindReasonString";

export function MintNFT({ userAddress }) {
  const [numberToMint, setNumberToMint] = useState(1);
  const [numberBurned, setNumberBurned] = useState(0);
  const [mintPrice, setMintPrice] = useState(0);
  const [ownedIDs, setOwnedIDs] = useState([]);
  const [collection, setCollection] = useState([]);
  const [focused, setFocused] = useState(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [symbolChangeFocus, setSymbolChangeFocus] = useState(null);
  const [changing, setChanging] = useState(false);

  const mintPriceRead = useContractRead({
    abi: bookNftABI,
    address: bookNftAddress,
    functionName: "getPrice",
    args: [numberToMint],
    cacheOnBlock: true
  });

  const mintTxParams = {
    abi: bookNftABI,
    address: bookNftAddress,
    functionName: "Mint",
    args: [numberToMint],
    value: mintPriceRead?.data
  };

  const { error: prepareError, isError: isPrepareError } =
    usePrepareContractWrite(mintTxParams);

  const { data, error, isError, write } = useContractWrite(mintTxParams);
  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash
  });

  /*
  useEffect(() => {
    readContract({
      abi: bookNftABI,
      address: bookNftAddress,
      functionName: "getPrice",
      args:[numberToMint]
    }).then(p =>{
      setMintPrice(p);
    })
  }, [numberToMint]);*/

  function checkBurnScore() {
    readContract({
      abi: bookNftABI,
      address: bookNftAddress,
      functionName: "getBurnScore",
      args: [userAddress]
    }).then((b) => {
      setNumberBurned(Number(b.toString()));
    });
  }

  function checkNumOwned() {
    readContract({
      address: bookNftAddress,
      abi: bookNftABI,
      functionName: "tokensOfOwner",
      args: [userAddress]
    }).then((ownedTokens) => {
      console.log("new owned is ", ownedTokens);

      setOwnedIDs(
        ownedTokens.map((bigInt) => {
          //convert bigint to number
          return Number(bigInt.toString());
        })
      );
    });
  }

  function getInfo(id) {
    var exists = Persistence.get(id);
    if (exists) {
      return Promise.resolve(exists);
    }
    return readContract({
      abi: bookNftABI,
      address: bookNftAddress,
      functionName: "tokenURI",
      args: [id.toString()]
    })
      .then((data) => {
        return fetch(data);
      })
      .then((data) => data.json())
      .then((result) => {
        result.id = id.toString();
        return Persistence.set(id, result);
      });
  }

  useEffect(() => {
    checkBurnScore();
    checkNumOwned();
  }, [userAddress]);

  useEffect(() => {
    if (isSuccess && !isLoading) {
      checkNumOwned();
    }
  }, [isSuccess, isLoading]);

  useEffect(() => {
    if (ownedIDs && ownedIDs.length !== collection.length) {
      setCollection([]);
      setCollectionLoading(true);
      setFocused(null);
      var p = Promise.resolve();
      _.each(ownedIDs, (id) => {
        p = p.then(() => {
          return getInfo(id.toString()).then((data) => {
            setCollection((c) => {
              return [...c, data];
            });
            return true;
          });
        });
      });

      p.then((books) => {
        setCollectionLoading(false);
        console.log("just set books", books);
      });
    }
  }, [ownedIDs.length]);

  useEffect(() => {
    if (mintPriceRead?.data) {
      console.log("set mint price to ", mintPriceRead?.data);
      setMintPrice(mintPriceRead?.data);
    } else {
      console.log("no mpr", mintPriceRead.data);
    }
  }, [mintPriceRead?.data]);

  useEffect(() => {
    if (!symbolChangeFocus) return;
    console.log("watching", symbolChangeFocus.id);
    const unwatch = watchContractEvent(
      {
        address: bookNftAddress,
        abi: bookNftABI,
        eventName: "BookMorphed"
      },
      (log) => {
        if (
          _.find(log, (event) => {
            return (
              _.get(event, "args.tokenId") === BigInt(symbolChangeFocus.id)
            );
          })
        ) {
          setSymbolChangeFocus(null);
          console.log("begin animation for change");
          Persistence.delete(symbolChangeFocus.id);
          getInfo(symbolChangeFocus.id).then((morphing) => {
            var newItem = { ...symbolChangeFocus, morphing, burning: true };

            setCollection((c) => {
              return c.map((item) => {
                if (item.id === symbolChangeFocus.id) {
                  return newItem;
                }
                return item;
              });
            });
            setFocused(newItem);

            setTimeout(() => {
              setChanging(false);
              console.log("begin cleanup for change animation finishing");
              setCollection((c) => {
                return c.map((item) => {
                  if (item.id === symbolChangeFocus.id) {
                    return morphing;
                  }
                  return item;
                });
              });
              setFocused(morphing);
              setSymbolChangeFocus(null);
              unwatch();
            }, 4000);
          });
        } else {
          console.log("not performing morph");
        }
      }
    );
    return () => {
      unwatch();
      console.log("stopped watching", symbolChangeFocus.id);
    };
  }, [symbolChangeFocus]);

  function burn(id) {
    writeContract({
      abi: bookNftABI,
      address: bookNftAddress,
      functionName: "burnBook",
      args: [id]
    }).then(() => {
      var item = _.find(collection, { id: id });
      setFocused((f) => {
        return { ...f, burning: true };
      });
      setTimeout(() => {
        Persistence.delete(item.id);
        setCollection((c) => {
          return c.filter((item) => item.id !== id);
        });
        setFocused(null);
        checkNumOwned();
        checkBurnScore();
      }, 2900);
    });
  }

  return (
    <div>
      <h2>Mint</h2>
      <label>
        Number to mint:
        <input
          type="number"
          value={numberToMint}
          style={{ width: "3em" }}
          onChange={(event) => {
            setNumberToMint(event.target.value);
          }}
        ></input>
      </label>
      <button
        disabled={!write || isLoading || isPrepareError}
        onClick={() => write?.()}
      >
        {isLoading
          ? "Minting..."
          : `Mint - ${
              mintPrice ? formatEther(mintPrice) + " Ether" : "FREE"
            } (+ gas fees)`}
      </button>
      {(isPrepareError || isError) && (
        <span
          style={{ padding: "0.2em", color: isPrepareError ? "orange" : "red" }}
        >
          Error:{" "}
          {findReasonString(prepareError ?? error)
            ? findReasonString(prepareError ?? error)
            : (prepareError || error)?.message}
        </span>
      )}

      {isSuccess && (
        <div>
          Successful mint!{" "}
          <a href={`https://basescan.org/tx/${data?.hash}`}>view transaction</a>
        </div>
      )}
      <br />
      <br />
      <label>Magic Points: {numberBurned}</label>
      <br />
      <Library
        ownedIDs={ownedIDs}
        collection={collection}
        collectionLoading={collectionLoading}
        //       onDragChange={onDragChange}
        numberBurned={numberBurned}
        focused={focused}
        setFocused={setFocused}
        symbolChangeFocus={symbolChangeFocus}
        setSymbolChangeFocus={setSymbolChangeFocus}
        burn={burn}
        changing={changing}
        setChanging={setChanging}
      />
    </div>
  );
}
