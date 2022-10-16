import * as ethers from "ethers";
import {
  signMakerOrder,
  addressesByNetwork,
  SupportedChainId,
  MakerOrder,
  encodeOrderParams,
  MakerOrderWithVRS,
  TakerOrder,
  UneMetaExchangeAbi,
  generateMakerOrderTypedData,
} from "@unemeta/sdk";

function App() {
  // connect wallet
  const connect = async () => {
    await (window as any).ethereum.request({
      method: "eth_requestAccounts",
    });
  };

  // list & make order
  const list = async () => {
    const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = ethersProvider.getSigner();
    const signerAddress = await signer.getAddress();
    const chainId = SupportedChainId.GOERLI;
    const addresses = addressesByNetwork[chainId];

    // Fetch from the api
    const nonceResp = await fetch(
      `/api/transaction/v1/dev/transaction/getNonce?wallet_address=${signerAddress}`
    );
    const nonceJson = await nonceResp.json();

    const now = Math.floor(Date.now() / 1000);
    const paramsValue = [] as any;

    const makerOrder: MakerOrder = {
      isOrderAsk: true,
      signer: signerAddress,
      collection: "", // collection contract address
      price: "1000000000000000", // Warning: PRICE IS ALWAYS IN WEI
      tokenId: "0", // Token id is 0 if you use the STRATEGY_COLLECTION_SALE strategy
      amount: 1, // Warning: amount is int
      strategy: addresses.STRATEGY_STANDARD_SALE,
      currency: addresses.WETH,
      nonce: nonceJson.data.nonce,
      startTime: now,
      endTime: now + 86400, // 1 day validity
      minPercentageToAsk: 8500,
      params: paramsValue,
    };
    const signatureHash = await signMakerOrder(signer, chainId, makerOrder);
    const r = await fetch("/api/transaction/v1/dev/transaction/order/make", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ order: { ...makerOrder, sign: signatureHash } }),
    });
    const rs = await r.json();
    console.log(rs);
  };

  /** private key sign with list */
  const privateList = async () => {
    const chainId = SupportedChainId.GOERLI;
    const addresses = addressesByNetwork[chainId];

    const signer = new ethers.Wallet("WALLET_PRIVATE_KEY");
    const signerAddress = await signer.getAddress();

    // Fetch from the api
    const nonceResp = await fetch(
      `/api/transaction/v1/dev/transaction/getNonce?wallet_address=${signerAddress}`
    );
    const nonceJson = await nonceResp.json();

    const now = Math.floor(Date.now() / 1000);
    const paramsValue = [] as any;

    const makerOrder: MakerOrder = {
      isOrderAsk: true,
      signer: signerAddress,
      collection: "", // collection contract address
      price: "1000000000000000", // Warning: PRICE IS ALWAYS IN WEI
      tokenId: "1", // Token id is 0 if you use the STRATEGY_COLLECTION_SALE strategy
      amount: 1, // Warning: amount is int
      strategy: addresses.STRATEGY_STANDARD_SALE,
      currency: addresses.WETH,
      nonce: nonceJson.data.nonce,
      startTime: now,
      endTime: now + 86400, // 1 day validity
      minPercentageToAsk: 8500,
      params: paramsValue,
    };
    const { domain, value, type } = generateMakerOrderTypedData(
      signerAddress,
      chainId,
      makerOrder
    );
    const signature = await signer._signTypedData(domain, type, value);

    const makeResp = await fetch(
      "/api/transaction/v1/dev/transaction/order/make",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ order: { ...makerOrder, sign: signature } }),
      }
    );
    const rs = await makeResp.json();
    console.log(rs);
  };

  /** take order */
  const takeOrder = async () => {
    // You should get this data by our api
    const makerOrderWithSignature = {
      isOrderAsk: true,
      signer: "0x5a279545Cb3fbE87E95A6db6494528d8F23b496f",
      collection: "0x0EFf3a881FC0a5Ba0d7b505007097aaDF75168F4",
      price: "1000000000000000",
      tokenId: "994",
      amount: 1,
      strategy: "0x9F5135DA881ba2f354ED25682DfbAC15E3dAAB78",
      currency: "0x6D4f489E651b74d77Bc497ef1F77aC406ba570dC",
      nonce: 1665893164,
      startTime: 1665893165,
      endTime: 1668485161,
      minPercentageToAsk: 8500,
      params: [],
      sign: "0xbd74ff31c523301235f1f134ee304c69e271bd59b11b8ba548af372b6c5cbd7e43ab7ddfb51d5fcf7eb4436531d37514b1d5ad2cdf326408b09e077fc684722d1b",
    };
    const { encodedParams } = encodeOrderParams(makerOrderWithSignature.params);
    const vrs = ethers.utils.splitSignature(makerOrderWithSignature.sign);
    const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);

    const signer = ethersProvider.getSigner();
    const signerAddress = await signer.getAddress();
    const chainId = SupportedChainId.GOERLI;
    const addresses = addressesByNetwork[chainId];

    const askWithoutHash: MakerOrderWithVRS = {
      ...makerOrderWithSignature,
      ...vrs,
      params: encodedParams,
    };

    const order: TakerOrder = {
      isOrderAsk: false,
      taker: signerAddress,
      price: ethers.BigNumber.from(makerOrderWithSignature.price),
      tokenId: makerOrderWithSignature.tokenId,
      minPercentageToAsk: makerOrderWithSignature.minPercentageToAsk,
      params: encodedParams,
    };

    const contract = new ethers.Contract(
      addresses.EXCHANGE,
      UneMetaExchangeAbi,
      signer
    );

    const tx = await contract.matchSellerOrdersWETH(order, askWithoutHash, {
      value: order.price,
    });
    const receipt = await tx.wait();
    console.log(receipt);
  };
  return (
    <div className="wrapper">
      <button onClick={connect}>connect</button>
      <button onClick={list}>List</button>
      <button onClick={privateList}>PrivateKey List</button>
      <button onClick={takeOrder}>Take Ordeer</button>
    </div>
  );
}

export default App;
