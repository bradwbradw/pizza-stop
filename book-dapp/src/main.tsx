import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { WagmiConfig } from "wagmi";

import { BookDapp } from "./BookDapp";
import { config } from "./wagmi";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiConfig config={config}>
      <BookDapp />
    </WagmiConfig>
  </React.StrictMode>
);
