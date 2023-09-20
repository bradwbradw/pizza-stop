import { useEffect, useState } from "react";
import { useWaitForTransaction } from "wagmi";
import { formatEther } from "viem";
import { _ } from "lodash";
import { readContract, writeContract, prepareWriteContract } from "@wagmi/core";

import findReasonString from "../modules/FindReasonString";

import {
  useNetwork,
  useContractRead,
  useContractWrite,
  //  UseContractWriteConfig,
  usePrepareContractWrite,
  useContractEvent,
} from "wagmi";

import { bookNftABI, bookNftAddress } from "../modules/Contract";

export default function SymbolChanger({ id, setDoPulse }) {
  const [symbol, setSymbol] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);
  const [symbolChangeLoading, setSymbolChangeLoading] = useState(false);

  const symbolChangeTxParams = {
    abi: bookNftABI,
    address: bookNftAddress,
    functionName: "setSymbol",
    args: [id, symbol],
  };

  useEffect(() => {
    if (symbol == "") {
      return;
    }
    prepareWriteContract(symbolChangeTxParams)
      .then((result) => {
        console.log("looks good", symbol);
        setErrorMsg(null);
      })
      .catch((err) => {
        console.error(err);
        var reasonString = findReasonString(err);
        if (reasonString) {
          setErrorMsg(reasonString);
        } else {
          console.log("could not find reason string", err);
          setErrorMsg(err.shortMessage);
        }
      });
  }, [symbol]);

  function executeSymbolChange() {
    if (errorMsg) {
      return;
    }
    setDoPulse(true);
    setSymbolChangeLoading(true);
    writeContract(symbolChangeTxParams)
      .then((result) => {
        setSymbolChangeLoading(false);
      })
      .catch((error) => {
        setDoPulse(false);
        debugger;
        setErrorMsg(error.shortMessage);
        setSymbolChangeLoading(false);
      });
  }

  return (
    <div className="symbol-changer">
      {!symbolChangeLoading && (
        <div>
          <label htmlFor="symbol editor">Paste Symbol Here:{"  "}</label>
          <input
            name="symbol editor"
            type="text"
            style={{
              fontSize: "24px",
              width: "3em",
              padding: "0.2em",
            }}
            maxLength={2}
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          />
          <span style={{ color: "orange", padding: "0.2em" }}>
            {errorMsg ? errorMsg : ""}
            {!errorMsg && symbol.length > 0 && <>✅</>}
          </span>
        </div>
      )}
      <div>
        <button
          disabled={symbolChangeLoading || !symbol || errorMsg}
          onClick={executeSymbolChange}
        >
          {symbolChangeLoading ? "Changing..." : "Change Symbol"}
        </button>
      </div>
    </div>
  );
}
