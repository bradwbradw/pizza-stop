import { useState } from "react";
import { useWaitForTransaction } from "wagmi";

import {
  useNetwork,
  useContractRead,
  useContractWrite,
  //  UseContractWriteConfig,
  usePrepareContractWrite,
  useContractEvent,
} from "wagmi";

import { bookNftABI, bookNftAddress } from "../modules/Contract";

export function MintNFT() {
  const { chain } = useNetwork();
  const [numberToMint, setNumberToMint] = useState(1);

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
  });
  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  return (
    <div>
      <label>
        Number of NFTs to mint:
        <input
          type="number"
          onChange={(event) => {
            setNumberToMint(event.target.value);
          }}
        ></input>
        n:{numberToMint}
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
    </div>
  );
}
