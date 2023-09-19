import { useEffect, useState } from "react";
import { useWaitForTransaction } from "wagmi";
import { formatEther } from "viem";
import { _ } from "lodash";
import { readContract, writeContract, prepareWriteContract } from "@wagmi/core";

import {
  useNetwork,
  useContractRead,
  useContractWrite,
  //  UseContractWriteConfig,
  usePrepareContractWrite,
  useContractEvent,
} from "wagmi";

import { bookNftABI, bookNftAddress } from "../modules/Contract";

export default function SymbolChanger({ id }) {
  const [symbol, setSymbol] = useState("﷽");
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
        var reasonString = _.trim(
          _.last(_.split(_.get(err, "details"), "reverted with reason string")),
          " '"
        );
        if (reasonString) {
          setErrorMsg(reasonString);
        } else {
          setErrorMsg(err.shortMessage);
        }
      });
  }, [symbol]);

  function executeSymbolChange() {
    if (errorMsg) {
      return;
    }
    setSymbolChangeLoading(true);
    writeContract(symbolChangeTxParams)
      .then((result) => {
        setSymbolChangeLoading(false);
      })
      .catch((error) => {
        setErrorMsg(error.message);
        setSymbolChangeLoading(false);
      });
  }

  return (
    <div className="symbol-changer">
      <div>
        <input
          type="text"
          placeholder="Enter new symbol"
          maxLength={2}
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
        <span style={{ color: "orange", padding: "0.2em" }}>
          {errorMsg ? errorMsg : ""}
        </span>
      </div>
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
