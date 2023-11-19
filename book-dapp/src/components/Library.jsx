import SymbolChanger from "./SymbolChanger.jsx";

import { _ } from "lodash";
import { Draggable } from "react-reorder-draggable";

export default function Library({
  ownedIDs,
  collection,
  collectionLoading,
  //  onDragChange,
  numberBurned,
  focused,
  setFocused,
  symbolChangeFocus,
  setSymbolChangeFocus,
  burn,
  changing,
  setChanging
}) {
  function SpineComponent({ item }) {
    return (
      <div
        className={
          "spineImage " + (focused && focused.id === item.id ? "focused" : "")
        }
        style={{
          position: "relative"
        }}
        onClick={() => {
          setFocused(item);
          setSymbolChangeFocus(null);
        }}
      >
        <img
          src={item.spineImage}
          style={{
            height: "200px",
            width: "auto"
          }}
        />
      </div>
    );
  }

  return (
    <>
      <h3>My Library {ownedIDs.length > 0 ? `(${ownedIDs.length})` : ""}</h3>
      {!collection || collectionLoading ? (
        <>your book collection is loading...</>
      ) : (
        ""
      )}
      <>
        <div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              border: "15px solid brown",
              borderImage: "url(./images/wood.png) 30 round",
              background: "rgb(165, 95, 42)",
              marginBottom: "2em",
              minHeight: "200px"
            }}
          >
            {collection.map((item, idx) => {
              return <SpineComponent item={item} key={idx}></SpineComponent>;
            })}
          </div>
        </div>
        {focused && (
          <>
            <div
              style={{
                position: "relative",
                height: "600px",
                display: "flex",
                justifyContent: "center"
              }}
            >
              <img
                src={focused.image}
                style={{
                  height: "100%",
                  position: "absolute"
                }}
                className={focused.burning ? "fadeOut" : ""}
              />
              {focused.morphing && (
                <img
                  src={focused.morphing.image}
                  style={{
                    height: "100%",
                    position: "absolute"
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
                alignItems: "center"
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
                {_.get(focused, "attributes", []).map((attr, idx) => {
                  return (
                    <div key={idx}>
                      <span
                        style={{
                          color: attr.color,
                          marginLeft: "0.5em"
                        }}
                      >
                        {attr.trait_type}:
                      </span>
                      <span style={{ marginLeft: "0.5em", fontWeight: "bold" }}>
                        {attr.value}
                      </span>
                      <br />
                    </div>
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
    </>
  );
}
