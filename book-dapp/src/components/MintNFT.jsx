import { useEffect, useState } from "react";
import { useWaitForTransaction } from "wagmi";
import { formatEther } from "viem";
import { _ } from "lodash";
import { readContract, writeContract, watchContractEvent } from "@wagmi/core";

import {
  useNetwork,
  useContractRead,
  useContractWrite,
  //  UseContractWriteConfig,
  usePrepareContractWrite,
  useContractEvent,
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
  });

  const mintTxParams = {
    abi: bookNftABI,
    address: bookNftAddress,
    functionName: "Mint",
    args: [numberToMint],
    value: mintPriceRead?.data,
  };

  const { error: prepareError, isError: isPrepareError } =
    usePrepareContractWrite(mintTxParams);

  const { data, error, isError, write } = useContractWrite(mintTxParams);
  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
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
      args: [userAddress],
    }).then((b) => {
      setNumberBurned(Number(b.toString()));
    });
  }

  function checkNumOwned() {
    readContract({
      address: bookNftAddress,
      abi: bookNftABI,
      functionName: "tokensOfOwner",
      args: [userAddress],
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
      args: [id.toString()],
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
        eventName: "BookMorphed",
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
      args: [id],
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
          : `Mint (cost: ${mintPrice ? formatEther(mintPrice)+ " Ether" : "FREE (+ gas fees)"}) `}
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
      <h3>My Library {ownedIDs.length > 0 ? `(${ownedIDs.length})` : ""}</h3>
      {!collection || collectionLoading ? (
        <>your book collection is loading...</>
      ) : (
        ""
      )}
      <>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            border: "15px solid brown",
            borderImage: "url(./images/wood.png) 30 round",
            background: "rgb(165, 95, 42)",
            marginBottom: "2em",
            minHeight: "200px",
          }}
        >
          {collection.map((item) => {
            return (
              <div
                className={
                  "spineImage " +
                  (focused && focused.id === item.id ? "focused" : "")
                }
                key={item.name}
                style={{
                  position: "relative",
                }}
                onClick={() => {
                  setFocused(item);
                  setSymbolChangeFocus(null);
                }}
              >
                {/*}
                <pre>{JSON.stringify(item[1], null, 2)}</pre>
                {*/}
                <img
                  src={item.spineImage}
                  style={{
                    height: "200px",
                    width: "auto",
                  }}
                />
              </div>
            );
          })}
        </div>
        {focused && (
          <>
            <div
              style={{
                position: "relative",
                height: "600px",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <img
                src={focused.image}
                style={{
                  height: "100%",
                  position: "absolute",
                }}
                className={focused.burning ? "fadeOut" : ""}
              />
              {focused.morphing && (
                <img
                  src={focused.morphing.image}
                  style={{
                    height: "100%",
                    position: "absolute",
                  }}
                  className={"fadeIn"}
                />
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <br />
              <button
                onClick={() => {
                  burn(focused.id);
                }}
              >
                Burn{" "}
                <label style={{ fontStyle: "italic" }}>(+1 Magic Point)</label>
              </button>
              {!changing && (
                <button
                  onClick={() => {
                    if (symbolChangeFocus) {
                      setSymbolChangeFocus(null);
                    } else {
                      setSymbolChangeFocus(focused);
                    }
                  }}
                  disabled={false && numberBurned < 5}
                >
                  {symbolChangeFocus ? "Cancel" : "Change Symbol"}
                  {numberBurned < 5 && !symbolChangeFocus ? (
                    <label style={{ fontStyle: "italic" }}>
                      {" "}
                      (need {5 - numberBurned} more Magic Points!)
                    </label>
                  ) : (
                    <> </>
                  )}
                </button>
              )}
              {changing && <>~~~ transforming ~~~</>}
              <br />
              {symbolChangeFocus && (
                <SymbolChanger
                  id={symbolChangeFocus.id}
                  setDoPulse={setChanging}
                />
              )}
              <div>
                <label style={{ fontWeight: "bold" }}>Name:</label>{" "}
                {focused.name}
                <br />
                <label style={{ fontWeight: "bold" }}>Attributes:</label> <br />
                {_.get(focused, "attributes", []).map((attr) => {
                  return (
                    <>
                      <span
                        style={{
                          color: attr.color,
                          marginLeft: "0.5em",
                        }}
                      >
                        {attr.trait_type}:
                      </span>
                      <span style={{ marginLeft: "0.5em", fontWeight: "bold" }}>
                        {attr.value}
                      </span>
                      <br />
                    </>
                  );
                })}
              </div>
              {/*}
              <pre style={{ maxWidth: "98vw", overflow:scroll}}>
                {JSON.stringify(_focused, null, 2)}
              </pre>{*/}
            </div>
          </>
        )}
        {!focused && <div style={{ height: "600px" }} />}
      </>
    </div>
  );
}
