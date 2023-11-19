import { BaseError } from "viem";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function Connect() {
  const { connector, isConnected } = useAccount();
  const { connect, connectors, error, isLoading, pendingConnector } =
    useConnect();
  const { disconnect } = useDisconnect();

  const { address } = useAccount();

  return (
    <div
      style={{
        maxWidth: "300px",
        float: "right",
        textAlign: "right",
        border: "1px dotted grey",
        padding: "0.5em",
      }}
    >
      {!isConnected && <>Connect using your favourite Web 3 extension:</>}
      <div>
        {isConnected && (
          <button onClick={() => disconnect()}>
            Disconnect from {connector?.name}{" "}
            <img
              src={`./images/${connector?.name}.svg`}
              alt={`${connector?.name} logo`}
              style={{ maxWidth: "75px" }}
            />
          </button>
        )}

        {!isConnected &&
          connectors
            .filter((x) => x.ready)
            .map((x, idx) => (
              <>
                <button key={idx} onClick={() => connect({ connector: x })}>
                  {x.name}{" "}
                  {isLoading &&
                    x.id === pendingConnector?.id &&
                    " (connecting)"}
                  <img
                    src={`./images/${x.name}.svg`}
                    alt={`${x.name} logo`}
                    style={{ maxWidth: "75px" }}
                  />
                </button>
                <br />
              </>
            ))}
        {isConnected && (
          <>
            <div style={{ fontFamily: "courier", fontSize: "12px" }}>
              your address: {address}
            </div>
          </>
        )}
      </div>
      {error && <div>{(error as BaseError).shortMessage}</div>}
    </div>
  );
}
