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
  MakerOrderWithoutNonce,
} from "@unemeta/sdk"
// import mockJson from './mock.json'
// import walletItemMock from './walletItemMock.json'
import axios from 'axios'
import { useState, useEffect } from "react";
import {
  jwtHelper,
  JWT_HEADER_KEY,
  WALLET_ADDRESS_KEY,
  EMAIL_KEY,
} from './jwt';
// UneMeta Open Api Key
// @see [https://unemetatest.readme.io/reference/getting-started-with-your-api]
const API_KEY = "";


const privateKey = '';
// const collectionAddr = "0x5A837952a0e32078c99A8CAbF24C78B1A8d75b78" // nft项目合约地址

const collectionAddr = "0xfcc905fa3fc98089a46acfc930a1170c6b4dbe9a" // nft项目合约地址

const wallet = new ethers.Wallet(privateKey);

// const ethPrice = "0.001"; // 以太坊数量，可以是字符串或数字
// const ethPriceParseWei = ethers.utils.parseEther(ethPrice);
// console.log(ethPriceParseWei, 'ethPriceParseWei')
// console.log(ethPriceParseWei.toString()); // 输出：1500000000000000000
const provider = new ethers.providers.JsonRpcProvider('https://ethereum-sepolia.blockpi.network/v1/rpc/b996731df2ff7902f1e992312561dfa62d656880');
const walletWithProvider = wallet.connect(provider);



const chainId = SupportedChainId.SEPOLIA;
const addresses = addressesByNetwork[chainId];
const domain = {
  chainId,
  name: 'UnemetaMarket',
  verifyingContract: addresses.EXCHANGE,
  version: '1',
};
function App() {
  // connect wallet
  // const connect = async () => {
  //   await (window as any).ethereum.request({
  //     method: "eth_chainId",
  //   });
  // };

  async function getLoginNonce() {
    /** 获取链接钱包的随机数 */
    // export function nonce(data: { walletAddress: string; type?: number }) {
    //   return requestV1<{ noce: string }>('/api/user/v1/users/nonce', {
    //     method: 'POST',
    //     body: data,
    //   });
    let params = {
      walletAddress: wallet.address,
      type: 1
    }

    const res = await axios.post(
      `api/backend/api/user/v1/users/nonce`,
      params
    );
    // console.log(res)
    return res.data
  }

  async function login(signData: string) {
    // 使用私钥创建钱包对象
    // const privateKey = 'your-private-key-here';
    // const wallet = new ethers.Wallet(privateKey);
    // 签名消息
    // const signedMessage = await wallet.signMessage(message);
    // console.log('Signed Message:', signedMessage);
    let params = {
      wallet_address: wallet.address,
      signData,
      metamask: true,
    }
    const res = await axios.post(
      `api/backend/api/user/v1/users/login`,
      params
    );
    let { data } = res.data
    debugger
    jwtHelper.setWalletAddress(params.wallet_address, {
      expires: new Date(+data.accessExpire * 1000),
    });
    jwtHelper.setToken(data.accessToken, {
      expires: new Date(+data.accessExpire * 1000),
    });

  }

  async function getChainId() {
    // 检查MetaMask是否安装
    if (typeof window.ethereum !== 'undefined') {
      try {
        // 创建提供者
        // const provider = new ethers.providers.Web3Provider(window.ethereum);

        // 获取网络信息
        const network = await provider.getNetwork();

        // 打印当前链ID
        console.log('Current Chain ID:', network.chainId);
        return network.chainId;
      } catch (error) {
        console.error('Error fetching chain ID:', error);
      }
    } else {
      console.error('MetaMask is not installed. Please install it to use this feature.');
    }
  }

  async function connect() {
    // 检查MetaMask是否安装
    // if (typeof window.ethereum !== 'undefined') {
    //   try {
    //     // // 请求用户授权连接钱包
    //     // await window.ethereum.request({ method: 'eth_requestAccounts' });

    //     // // 创建提供者
    //     // const provider = new ethers.providers.Web3Provider(window.ethereum);

    //     // // 获取签名者（钱包）
    //     // const signer = provider.getSigner();

    //     // console.log('Connected MetaMask Wallet Address:', await signer.getAddress());
    //     // 使用私钥创建钱包对象
    //     const wallet = new ethers.Wallet(privateKey);
    //     let res = await getLoginNonce()
    //     console.log(res.data.noce, 'signer')
    //     console.log(wallet.address, 'wallet address')
    //     // let signature = await signer.signMessage(res.data.noce)
    //     let signature = await wallet.signMessage(res.data.noce)
    //     console.log(signature, 'signature')
    //     login(signature)
    //     // return signer;
    //   } catch (error) {
    //     console.error('User denied account access or there was an error connecting:', error);
    //   }
    // } else {
    //   console.error('MetaMask is not installed. Please install it to use this feature.');
    // }

    try {
      // 使用私钥创建钱包对象
      // const wallet = new ethers.Wallet(privateKey);
      let res = await getLoginNonce()
      // console.log(res.data.noce, 'signer')
      let signature = await wallet.signMessage(res.data.noce)
      console.log(signature, 'signature')
      login(signature)
      // return signer;
    } catch (error) {
      console.error('User denied account access or there was an error connecting:', error);
    }
  }

  // 获取该合约下的项目itemlist 用来扫挂单
  const getList = async () => {
    try {
      //order_type=3 为价格从低到高
      let params = { "order_type": 3, "address": collectionAddr, "rare_mode": false, "chain_id": chainId, "page": 1, "page_size": 30 }
      const res = await axios.post(
        `api/backend/api/market/v1/collection/item/list`,
        params
      );
      let item = res.data.data.item
      let list = item.filter((order: any) => {
        if (order.owner.toLocaleUpperCase() !== wallet.address.toLocaleUpperCase() && order.is_sell) {
          return true
        }
      })
      console.log(list)
      list.forEach((item: any) => {
        item.formatPrice = ethers.utils.formatUnits(ethers.BigNumber.from(item.price), 'ether') + 'ETH'
      })
      setList(list)
      return list
    } catch (error) {
      console.log(error)
    }
  }
  // 获取当前钱包下的nft列表
  const getWalletItemList = async () => {
    try {
      let params = { "wallet_address": wallet.address, "chain_id": SupportedChainId.SEPOLIA, "page": 1, "page_size": 100, "owner_wallet_address": wallet.address }
      const res = await axios.post(
        `api/backend/api/market/v1/item/list`,
        params
      );
      // is_sell price
      let { item } = res.data.data
      let leftItem = item.filter((nft: any) => {
        if (!nft.is_sell && nft.collection_address.toLocaleUpperCase() === collectionAddr.toLocaleUpperCase()) {
          return true
        }
      })
      console.log('过滤出该合约下未挂单的', leftItem)
      return leftItem
    } catch (error) {
      console.log(error)
    }
  }
  // 获取当前nft的详情
  const getItemDetail = async (item: any) => {
    // let hexTokenId = `${new BigNumberjs(tokenId).toString(16)}`;
    // if (hexTokenId?.length < 64) {
    //   hexTokenId = hexTokenId.padStart(64, '0');
    // }
    try {
      let params = { "collection_address": collectionAddr, "chain_id": String(SupportedChainId.SEPOLIA), "token_id": item.token_id }
      const queryString = new URLSearchParams(params).toString();
      const res = await axios.get(
        `api/backend/api/market/v1/item/detail?${queryString}`,
        {
          headers: {
            // "x-api-key": API_KEY,
            [JWT_HEADER_KEY]: jwtHelper.getToken()
          },
        }
      );
      console.log(res.data.data)
      return res.data.data
    } catch (error) {
      console.log(error)
    }
  }
  // private key sign with list
  const privateList = async (item: any, priceWei: string) => {
    // addresses.SELL_APPROVAL
    const res = await axios.get(
      `api/backend/api/transaction/v1/transaction/getNonce?wallet_address=${wallet.address}`,
      {
        headers: {
          [JWT_HEADER_KEY]: jwtHelper.getToken()
        }
      }
    );
    let nonce = res.data.data.nonce
    const now = Math.floor(Date.now() / 1000);
    const paramsValue = [] as any;

    const withoutNonceOorder: MakerOrderWithoutNonce = {
      isOrderAsk: true,
      signer: wallet.address,
      collection: collectionAddr, // collection contract address
      // price: ethPriceParseWei.toString(), // Warning: PRICE IS ALWAYS IN WEI
      price: priceWei, // Warning: PRICE IS ALWAYS IN WEI
      tokenId: item.token_id, // 0x16进制
      // tokenId: "0x0000000000000000000000000000000000000000000000000000000000000142", // Token id is 0 if you use the STRATEGY_COLLECTION_SALE strategy
      amount: 1, // Warning: amount is int
      strategy: addresses.STRATEGY_STANDARD_SALE,
      currency: addresses.LOCAL_WRAPPER_CURRENCY,
      startTime: now,
      endTime: now + 86400, // 1 day validity
      minPercentageToAsk: 8500,
      params: paramsValue,
    };
    const order = {
      ...withoutNonceOorder,
      nonce: nonce,
    } as MakerOrder;
    // const makerOrder: MakerOrder = {
    //   isOrderAsk: true,
    //   signer: signerAddress,
    //   collection: "", // collection contract address
    //   price: ethPriceParseWei.toString(), // Warning: PRICE IS ALWAYS IN WEI
    //   tokenId: "1", // Token id is 0 if you use the STRATEGY_COLLECTION_SALE strategy
    //   amount: 1, // Warning: amount is int
    //   strategy: addresses.STRATEGY_STANDARD_SALE,
    //   currency: addresses.LOCAL_WRAPPER_CURRENCY,
    //   nonce: nonce,
    //   startTime: now,
    //   endTime: now + 86400, // 1 day validity
    //   minPercentageToAsk: 8500,
    //   params: paramsValue,
    // };
    // const { domain, value, type } = generateMakerOrderTypedData(
    //   signerAddress,
    //   chainId,
    //   makerOrder
    // );

    const { value, type } = generateMakerOrderTypedData(
      wallet.address,
      order
    );
    const signature = await wallet._signTypedData(domain, type, value);
    const orderRes = await axios.post("api/backend/api/transaction/v1/transaction/order/make",
      { order: { ...order, sign: signature }, chain_id: SupportedChainId.SEPOLIA, itemId: item.item_id, walletAddress: wallet.address, status: true }, {
      headers: {
        [JWT_HEADER_KEY]: jwtHelper.getToken()
      }
    })
    console.log(orderRes, 'orderRes:挂单成功');
  };

  // take order
  const takeOrder = async (item: any) => {
    // You should get `makerOrderWithSignature` data from unemeta open api
    // @see https://unemetatest.readme.io/reference/getting-started-with-your-api

    //res.data.data.item_info.order_id
    //res.data.data.chain_id
    let params = { order_id: item.order_id, chain_id: String(chainId) }
    const queryString = new URLSearchParams(params).toString();
    let orderRes = await axios.get(`api/backend/api/transaction/v1/transaction/order/get?${queryString}`, {
      headers: {
        [JWT_HEADER_KEY]: jwtHelper.getToken()
      }
    })
    // const makerOrderWithSignature = {
    //   isOrderAsk: true,
    //   signer: "0x5a279545Cb3fbE87E95A6db6494528d8F23b496f",
    //   collection: "0x0EFf3a881FC0a5Ba0d7b505007097aaDF75168F4",
    //   price: "1000000000000000",
    //   tokenId: "994",
    //   amount: 1,
    //   strategy: "0x9F5135DA881ba2f354ED25682DfbAC15E3dAAB78",
    //   currency: "0x6D4f489E651b74d77Bc497ef1F77aC406ba570dC",
    //   nonce: 1665893164,
    //   startTime: 1665893165,
    //   endTime: 1668485161,
    //   minPercentageToAsk: 8500,
    //   params: [],
    //   sign: "0xbd74ff31c523301235f1f134ee304c69e271bd59b11b8ba548af372b6c5cbd7e43ab7ddfb51d5fcf7eb4436531d37514b1d5ad2cdf326408b09e077fc684722d1b",
    // };
    // const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
    // const signer = ethersProvider.getSigner();
    // const signerAddress = await signer.getAddress();
    // const addresses = addressesByNetwork[chainId];


    // debugger
    // const makerOrderWithSignature = orderRes.data.data.order
    // const { encodedParams } = encodeOrderParams(makerOrderWithSignature.params);
    // const vrs = ethers.utils.splitSignature(makerOrderWithSignature.sign);
    // const askWithoutHash: MakerOrderWithVRS = {
    //   ...makerOrderWithSignature,
    //   ...vrs,
    //   params: encodedParams,
    // };
    // const order: TakerOrder = {
    //   isOrderAsk: false,
    //   taker: wallet.address,
    //   price: ethers.BigNumber.from(makerOrderWithSignature.price),
    //   tokenId: makerOrderWithSignature.tokenId,
    //   minPercentageToAsk: makerOrderWithSignature.minPercentageToAsk,
    //   params: encodedParams,
    // };

    // const contract = new ethers.Contract(
    //   addresses.EXCHANGE,
    //   UneMetaExchangeAbi,
    //   provider
    // );
    // const tx = await contract.matchSellerOrdersWETH(order, askWithoutHash, {
    //   value: order.price,
    // });
    // debugger
    const { sign, ...orderRest } = orderRes.data.data.order;
    const signedOrder = ethers.utils.splitSignature(sign);

    const contract = new ethers.Contract(
      addresses.EXCHANGE,
      UneMetaExchangeAbi,
      walletWithProvider
    );
    const takerBidOrder: TakerOrder = {
      isOrderAsk: false,
      taker: wallet.address,
      price: ethers.BigNumber.from(orderRest.price),
      tokenId: orderRest.tokenId,
      minPercentageToAsk: orderRest.minPercentageToAsk,
      params: ethers.utils.defaultAbiCoder.encode([], []),
    };
    const makerAskOrder: MakerOrderWithVRS = {
      ...orderRest,
      isOrderAsk: true,
      params: takerBidOrder.params,
      r: signedOrder.r,
      s: signedOrder.s,
      v: signedOrder.v,
    };
    const tx =
      await contract.matchSellerOrdersWETH(
        takerBidOrder,
        makerAskOrder,
        {
          value: takerBidOrder.price
        },
      );
    let transaction = await walletWithProvider.sendTransaction(tx)

    console.log('Transaction Hash:', transaction.hash);

    //等待交易被挖矿确认
    const receipt = await transaction.wait();
    console.log('Transaction was mined in block:', receipt.blockNumber);
  };

  // 延迟函数
  const sleep = (time: number) =>
    new Promise((resolve) => setTimeout(resolve, time));

  // 设置某个区间的随机值
  /**
   * 
   * @param m 最小值
   * @param n 最大值
   * @param leftLength 格式化长度
   * @returns 
   */
  const getRandom = (m: number, n: number, leftLength: number) => {
    let res = Math.random() * (n - m) + m
    return res.toFixed(leftLength)
  }

  // 批量挂单
  const batchList = async () => {
    let nftList = await getWalletItemList()
    for (let i = 0; i < nftList.length; i++) {
      let randomPrice = getRandom(min, max, 2)
      console.log(randomPrice)
      const ethPriceParseWei = ethers.utils.parseEther(randomPrice).toString();
      setTimeout(() => {
        privateList(nftList[i], ethPriceParseWei)
      }, i * 800)
    }
  }
  // 批量购买
  const batchBuy = async () => {
    let list = await getList()
    let maxAmount = 5
    if (list.length > maxAmount) {
      list = list.slice(0, maxAmount)
    }
    for (let i = 0; i < list.length; i++) {
      setTimeout(async () => {
        let itemDetail = await getItemDetail(list[i])
        console.log(itemDetail, 'itemDetail')
        takeOrder(itemDetail.item_info)
      }, 2000 * i)
    }
  }
  const [collectionList, setList] = useState([])
  const [min, setMin] = useState(0.1)
  const [max, setMax] = useState(0.3)

  useEffect(() => {
    getList()
    // getWalletItemList()
  }, [])


  return (
    <div className="wrapper">
      <button onClick={connect}>登陆获取cookie</button>

      <h2>买入</h2>
      <button onClick={getList}> 获取最低价格列表(不包含自己) </button>
      <div style={{ display: 'flex' }}>
        {collectionList.map((item: any) => {
          return (
            <div key={item.name} onClick={() => { getItemDetail(item) }} style={{ 'marginLeft': '20px' }}>
              <img src={item.logo} width={80} height={80}></img>
              <div>{item.name}</div>
              <div>Item:{item.formatPrice}</div>
            </div>
          )
        })}
      </div>
      <button onClick={batchBuy}>批量购买</button>
      <h2>------------</h2>
      <h2>挂单</h2>
      <button onClick={getWalletItemList}>获取该合约未被挂单的nft</button>
      <div>
        <h2>在区间内使用随机值挂单</h2>
        <div>
          <span>min:</span>
          <input onChange={(e) => { setMin(Number(e.target.value)) }} type="number" step={0.1}></input>
        </div>
        <div>
          <span>max:</span>
          <input onChange={(e) => { setMax(Number(e.target.value)) }} type="number" step={0.1}></input>
        </div>
      </div>
      <button onClick={batchList}>批量挂单</button>

    </div >
  );
}

export default App;
