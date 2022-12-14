const { ethers, network } = require("hardhat")
const { moveBlocks } = require("../utils/move-blocks")

const PRICE = ethers.utils.parseEther("0.1")

const mintAndList = async () => {
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    const basicNft = await ethers.getContract("BasicNft")

    const mintTx = await basicNft.mintNft()
    console.log(`Minting... TX: ${mintTx.hash}`)
    const mintTxReceipt = await mintTx.wait(1)
    const tokenId = mintTxReceipt.events[0].args.tokenId

    const approvalTx = await basicNft.approve(nftMarketplace.address, tokenId)
    console.log(`Approving Nft... TX: ${approvalTx.hash}`)
    await approvalTx.wait(1)

    const tx = await nftMarketplace.listItem(basicNft.address, tokenId, PRICE)
    console.log(`Listing NFT... TX: ${tx.hash}`)
    await tx.wait(1)
    console.log("Listed!")

    if (network.config.chainId == "31337") {
        await moveBlocks(2, (sleepAmount = 1000))
    }
}

mintAndList()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
