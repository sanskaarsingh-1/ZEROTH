// ZEROTH keeper: CoW Protocol-style conditional orders. poll() mirrors the watch-tower contract:
// each policy is (handler, params); a poll says READY (cut a discrete order), TRY_NEXT, TRY_AT(time) or NEVER/EXPIRED.
export const COIN={ETH:'ethereum',WETH:'ethereum',WBTC:'bitcoin',BTC:'bitcoin',SOL:'solana',LINK:'chainlink',AAVE:'aave',STETH:'lido-staked-ether',WSTETH:'lido-staked-ether',USDC:1,USDT:1,DAI:1};
export const HANDLERS=['stop-loss','take-profit','twap','good-after-time'];
export function poll(p,price,now=Date.now()){
 if(['completed','cancelled'].includes(p.status))return{code:'NEVER',reason:p.status};
 if(now>p.validUntil)return{code:'EXPIRED',reason:'policy expired'};
 if(p.handler==='good-after-time')return now<p.startTime?{code:'TRY_AT',at:p.startTime,reason:'waiting for start time'}:{code:'READY',reason:'start time reached'};
 if(p.handler==='twap')return now<p.nextAt?{code:'TRY_AT',at:p.nextAt,reason:`part ${p.partsDone+1}/${p.parts} waits for its interval`}:{code:'READY',reason:`part ${p.partsDone+1}/${p.parts} is due`};
 if(price==null)return{code:'TRY_NEXT',reason:'price unavailable, retrying'};
 const hit=p.handler==='stop-loss'?price<=p.strike:price>=p.strike;
 return hit?{code:'READY',reason:`price $${price} crossed trigger $${p.strike}`}:{code:'TRY_NEXT',reason:`price $${price} vs trigger $${p.strike}`};
}
