const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Basic NFT Unit Tests", function () {
          let nftMarketplace, basicNft, deployer, player
          const PRICE = ethers.utils.parseEther("0.1")
          const TOKEN_ID = 0

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              const accounts = await ethers.getSigners()
              player = accounts[1]
              await deployments.fixture(["all"]) // get deployed contracts with tag "basicnft"
              nftMarketplace = await ethers.getContract("NftMarketplace") // get retrieved contract that matches name "BasicNft"
              basicNft = await ethers.getContract("BasicNft") // get retrieved contract that matches name "BasicNft"
              await basicNft.mintNft()
              await basicNft.approve(nftMarketplace.address, TOKEN_ID)
          })

          describe("listItem", () => {
              it("New user has 0 proceeds posted to account", async function () {
                  const txResponse = await nftMarketplace.getProceeds(deployer)
                  assert.equal(txResponse.toString(), 0)
              })
              it("User is able to list an NFT", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)

                  const playerConnectedNftMarketplace = nftMarketplace.connect(player)
                  await playerConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                      value: PRICE,
                  })

                  const newOwner = await basicNft.ownerOf(TOKEN_ID)
                  const deployerProceeds = await nftMarketplace.getProceeds(deployer)
                  assert(newOwner.toString() == player.address)
                  assert(deployerProceeds.toString() == PRICE.toString())
              })
          })
          describe("cancelListing", function () {
              it("reverts if there is no listing", async function () {
                  await expect(
                      nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWithCustomError(nftMarketplace, `NftMarketplace__NotListed`)
              })
              it("reverts if anyone but the owner tries to call", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const playerConnectedNftMarketplace = nftMarketplace.connect(player)
                  await expect(
                      playerConnectedNftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWithCustomError(nftMarketplace, `NftMarketplace__NotOwner`)
              })
              it("emits event and removes listing", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
              })
          })
          describe("buyItem", function () {
              it("reverts if the item isnt listed", async function () {
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWithCustomError(nftMarketplace, `NftMarketplace__NotListed`)
              })
              it("reverts if the price isnt met", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const playerConnectedNftMarketplace = nftMarketplace.connect(player)
                  await expect(
                      playerConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                          value: ethers.utils.parseEther("0.05"),
                      })
                  ).to.be.revertedWithCustomError(nftMarketplace, `NftMarketplace__PriceNotMet`)
              })
              it("transfers the nft to the buyer and updates internal proceeds record", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const playerConnectedNftMarketplace = nftMarketplace.connect(player)
                  await playerConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                      value: ethers.utils.parseEther("0.1"),
                  })
                  const newOwner = await basicNft.ownerOf(TOKEN_ID)
                  assert(newOwner.toString() == player.address)
              })
          })
          describe("updateListing", function () {
              it("must be owner", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const playerConnectedNftMarketplace = nftMarketplace.connect(player)
                  await expect(
                      playerConnectedNftMarketplace.updateListing(
                          basicNft.address,
                          TOKEN_ID,
                          ethers.utils.parseEther("0.2")
                      )
                  ).to.be.revertedWithCustomError(nftMarketplace, `NftMarketplace__NotOwner`)
              })
              it("must be listed", async function () {
                  await expect(
                      nftMarketplace.updateListing(
                          basicNft.address,
                          TOKEN_ID,
                          ethers.utils.parseEther("0.2")
                      )
                  ).to.be.revertedWithCustomError(nftMarketplace, `NftMarketplace__NotListed`)
              })
              it("updates the price of the item", async function () {
                  const newPrice = ethers.utils.parseEther("0.2").toString()
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, newPrice)
                  ).to.emit(nftMarketplace, "ItemListed")
                  const updatedListing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                  assert.equal(newPrice, updatedListing.price.toString())
              })
          })
          describe("withdrawProceeds", function () {
              it("doesn't allow 0 proceed withdrawls", async function () {
                  const playerConnectedNftMarketplace = nftMarketplace.connect(player)
                  await expect(
                      playerConnectedNftMarketplace.withdrawProceeds()
                  ).to.be.revertedWithCustomError(nftMarketplace, `NftMarketplace__NoProceeds`)
              })
              it("withdraws proceeds", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const playerConnectedNftMarketplace = nftMarketplace.connect(player)

                  const initialProceeds = ethers.utils.formatEther(
                      await nftMarketplace.getProceeds(deployer)
                  )
                  await playerConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                      value: PRICE,
                  })

                  const afterBuyProceeds = ethers.utils.formatEther(
                      await nftMarketplace.getProceeds(deployer)
                  )

                  await nftMarketplace.withdrawProceeds()
                  const afterWithdrawProceeds = ethers.utils.formatEther(
                      await nftMarketplace.getProceeds(deployer)
                  )
                  assert.equal(initialProceeds, "0.0")
                  assert.equal(afterBuyProceeds, ethers.utils.formatEther(PRICE.toString()))
                  assert.equal(afterWithdrawProceeds, "0.0")
              })
          })
      })
