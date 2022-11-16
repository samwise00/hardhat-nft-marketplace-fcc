const { ethers, network } = require("hardhat")
const { moveBlocks } = require("../utils/move-blocks")

const mint = async () => {
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    const basicNft = await ethers.getContract("BasicNft")

    const mintTx = await basicNft.mintNft()
    console.log(`Minting... TX: ${mintTx.hash}`)
    const mintTxReceipt = await mintTx.wait(1)
    const tokenId = mintTxReceipt.events[0].args.tokenId
    console.log(`Got TokenID: ${tokenId}`)
    console.log(`NFT Address: ${basicNft.address}`)

    if (network.config.chainId == "31337") {
        await moveBlocks(2, (sleepAmount = 5000))
    }
}

mint()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
