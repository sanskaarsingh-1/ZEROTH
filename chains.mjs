// Supported EVM chains. Aave V3 pool addresses come from public Aave deployment listings;
// re-verify against the official Aave address book before sending real funds.
const AAVE_CANON='0x794a61358D6845594F94dc1DB02A252b5b4814aD';
export const CHAINS=[
{id:1,cow:"mainnet",name:'Ethereum',symbol:'ETH',rpc:'https://eth.llamarpc.com',explorer:'https://etherscan.io',aavePool:'0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',swap:true,testnet:false},
{id:42161,cow:"arbitrum_one",name:'Arbitrum One',symbol:'ETH',rpc:'https://arb1.arbitrum.io/rpc',explorer:'https://arbiscan.io',aavePool:AAVE_CANON,swap:true,testnet:false},
{id:10,cow:null,name:'Optimism',symbol:'ETH',rpc:'https://mainnet.optimism.io',explorer:'https://optimistic.etherscan.io',aavePool:AAVE_CANON,swap:true,testnet:false},
{id:8453,cow:"base",name:'Base',symbol:'ETH',rpc:'https://mainnet.base.org',explorer:'https://basescan.org',aavePool:'0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',swap:true,testnet:false},
{id:137,cow:"polygon",name:'Polygon',symbol:'POL',rpc:'https://polygon-rpc.com',explorer:'https://polygonscan.com',aavePool:AAVE_CANON,swap:true,testnet:false},
{id:43114,cow:"avalanche",name:'Avalanche',symbol:'AVAX',rpc:'https://api.avax.network/ext/bc/C/rpc',explorer:'https://snowtrace.io',aavePool:AAVE_CANON,swap:true,testnet:false},
{id:56,cow:"bnb",name:'BNB Chain',symbol:'BNB',rpc:'https://bsc-dataseed.binance.org',explorer:'https://bscscan.com',aavePool:'0x6807dc923806fE8Fd134338EABCA509979a7e0cB',swap:true,testnet:false},
{id:11155111,cow:"sepolia",name:'Sepolia (testnet)',symbol:'ETH',rpc:'https://rpc.sepolia.org',explorer:'https://sepolia.etherscan.io',aavePool:'0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',swap:false,testnet:true}
];
