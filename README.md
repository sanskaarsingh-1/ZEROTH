<<<<<<< HEAD
# ZEROTH — integrated DeFi hackathon MVP

A DeFi Saver-inspired, **independently designed** multi-workspace UI with ZEROTH's original dark/mint/blue visual language, a Node backend, wallet authentication, authenticated persisted policy drafts, indicative auctions, and opt-in blockchain integrations.

## Run (Windows PowerShell)

```powershell
cd zeroth-refined
npm install
npm start
```

Open http://localhost:3000/ — the landing page. Its "Launch app" button opens the workspace at /app.

Requires Node 20+ and internet access for installation and the frontend ethers ESM module. No `better-sqlite3`, Visual Studio Build Tools or Windows SDK required.

## Supported chains

Ethereum, Arbitrum One, Optimism, Base, Polygon, Avalanche, BNB Chain and Sepolia (testnet), defined in `chains.mjs`. Use the network selector in the top bar; the app asks your wallet to switch (or add) the chain. Aave V3 pool addresses are built in; **re-verify them against the official Aave address book before using real funds.** Token addresses are not built in: set them per chain with `TOKENS_JSON`, e.g. `{"1":{"USDC":{"address":"0x...","decimals":6}},"8453":{"USDC":{"address":"0x...","decimals":6}}}`. `CHAIN_ID` sets the default chain (Sepolia if unset). 0x swaps work on the mainnets above (not Sepolia) with `ZEROX_API_KEY`.

## Policies (CoW Protocol-style conditional orders)

Policy types: stop loss, take profit, TWAP and good-after-time. Like CoW's ComposableCoW, each policy is a handler plus parameters. A server-side keeper (`keeper.mjs`, runs every 30s) polls each policy and returns READY, TRY_NEXT, TRY_AT or NEVER/EXPIRED. When READY, the Policy engine page shows **Sign & submit**: your wallet signs one EIP-712 order that is posted to the CoW orderbook (`api.cow.fi`), and CoW solvers settle it in a batch auction. The sell token needs a one-time approval to the CoW Vault Relayer.

Limits: this is semi-automatic because the owner is an EOA wallet, so each discrete order needs your signature. Fully hands-free execution needs a smart-contract owner (a Safe using ComposableCoW and CoW's watch-tower), which is not built yet. Trigger prices use CoinGecko (not an on-chain oracle). CoW does not support selling on Optimism. Orders use a 0.5% slippage floor below the CoW quote. Untested on a live chain; use Sepolia first. Needs `TOKENS_JSON` entries for the sell and buy tokens on the chosen chain.

## Integration configuration

The server reads environment variables at startup. For example:

```powershell
$env:CHAIN_ID="11155111"
$env:AAVE_POOL="0xVERIFIED_AAVE_POOL_ADDRESS"
$env:TOKENS_JSON='{"USDC":{"address":"0xVERIFIED_TOKEN_ADDRESS","decimals":6}}'
$env:ZEROX_API_KEY="YOUR_KEY"
npm start
```

**Replace placeholders only with verified addresses for the selected chain.** Do not paste private keys. Check official protocol deployment documentation. The server intentionally refuses transactions when AAVE_POOL or token configuration is absent. 0x API availability depends on whether the selected chain is supported.

### What's real vs incomplete

| Feature | State |
|---|---|
| Landing page, multi-workspace app, wallet connection and native balance | Implemented |
| Charts: sample-position overview, risk simulator, rate charts | Computed locally from your inputs or labelled sample data; not live market data |
| Live crypto prices and price charts | CoinGecko public API via /api/prices and /api/chart (server cache; optional COINGECKO_API_KEY) |
| Portfolio, Boost & Repay, Shifter preview | Sample or simulated only; no execution contracts deployed |
| Backend REST API and persistent JSON storage | Implemented (local development, not production database) |
| Wallet signature nonce login | Implemented using ethers verifyMessage; session in server memory |
| Policies (stop loss, take profit, TWAP, good-after-time) | Keeper polls on the server; you sign each CoW order; **untested on a live chain** |
| Indicative rate auction creation and bids | Implemented backend; **no escrow or on-chain settlement** |
| Aave supply/borrow/repay/withdraw | Wallet execution implemented **only after configuring verified pool + tokens**; untested on a live chain |
| 0x swap quotes, ERC-20 approval and wallet execution | Integration implemented **only with API key, supported chain and tokens**; untested on a live chain |
| Wallet-specific transaction hash log | Implemented; server does not independently verify confirmations |
| Flash loans | Composer UI only; receiver contract not deployed |
| Automated collateral rescue | Rule draft UI only; oracle/keeper/contract not deployed |
| Asset tokenization | UI only; token factory not deployed |
| Cross-asset *position migration* | UI only; simple token swap integration does not migrate lending debt/collateral |
| Lending market APYs | Illustrative only; no live market indexer |

## Security and production readiness

**Do not use real funds.** This code is a hackathon development foundation and has not been audited or tested against live deployments. Validate pool and token addresses, asset decimals, available liquidity, health factor, wallet network, token approvals, gas and 0x swap quotes. Do not deploy the JSON storage or in-memory sessions as a production backend. Add HTTPS, CSRF/rate limiting, durable session storage, monitoring, chain-aware signed messages, oracle/indexer and audited contract integrations before production.

The front-end includes a legacy browser-local policy draft interface as well as an authenticated backend policy panel. Only the authenticated panel persists to the backend.

## API

`GET /api/health`, `GET /api/config`, `GET /api/markets`, `GET /api/portfolio`, `POST /api/auth/nonce`, `POST /api/auth/verify`, authenticated `GET/POST /api/policies`, authenticated `DELETE /api/policies/:id`, `GET/POST /api/auctions`, authenticated `POST /api/auctions/:id/bids`, authenticated `GET/POST /api/transactions`, `GET /api/swap/quote` (key required).

### References

- Aave V3 Pool: https://aave.com/docs/aave-v3/smart-contracts/pool
- 0x Swap API: https://docs.0x.org/docs/introduction/quickstart/swap-tokens-with-0x-swap-api
=======

>>>>>>> 19f84aa606baaa74c72609f41bab3f835697f159
