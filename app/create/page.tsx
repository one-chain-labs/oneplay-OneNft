"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CheckCircle, Upload, Camera, FileText, Sparkles } from "lucide-react"
import { TokenizationForm } from "@/components/tokenization/tokenization-form"
import { TokenizationPreview } from "@/components/tokenization/tokenization-preview"
import { TokenizationSuccess } from "@/components/tokenization/tokenization-success"
import type { TokenizationRequest } from "@/lib/types"
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@onelabs/dapp-kit"
import { Transaction } from "@onelabs/sui/transactions"
import { CONTRACT_ADDRESSES, CONTRACT_MODULE, contractTarget } from "@/lib/onelabs"
import { useToast } from "@/hooks/use-toast"
import { useOneWallet } from "@/lib/wallet"
import { logTransaction, saveMintedNFT } from "@/lib/nft-repository"
import { useLanguage } from "@/components/providers/language-provider"
import { currentNetwork } from "@/lib/onelabs"


export default function CreatePage() {
  const { t } = useLanguage()
  const [currentStep, setCurrentStep] = useState(1)
  const [tokenizationData, setTokenizationData] = useState<Partial<TokenizationRequest>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [mintedNFT, setMintedNFT] = useState<any>(null)
  
  const account = useCurrentAccount()
  const { mutate: signAndExecute, isPending: isTransactionPending, reset } = useSignAndExecuteTransaction()
  const suiClient = useSuiClient()
  const { toast } = useToast()
  const { isConnected } = useOneWallet()
  
  // Combine loading states
  const isMinting = isLoading || isTransactionPending

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFormSubmit = (data: Partial<TokenizationRequest>) => {
    // Preserve images if they exist in current tokenizationData
    const updatedData = {
      ...tokenizationData,
      ...data,
      // Only update images if new images are provided, otherwise keep existing ones
      images: data.images && data.images.length > 0 ? data.images : tokenizationData.images,
    }
    console.log("Form submitted with data:", updatedData)
    console.log("Images in updated data:", updatedData.images)
    setTokenizationData(updatedData)
    handleNext()
  }

  // Upload image to Supabase and get URL
  const uploadImageToSupabase = async (file: File): Promise<string> => {
    const { uploadImageToSupabase } = await import("@/lib/supabase")
    return uploadImageToSupabase(file)
  }

  // Convert rarity string to number (1-5)
  const getRarityNumber = (rarity?: string): number => {
    const rarityMap: Record<string, number> = {
      common: 1,
      uncommon: 2,
      rare: 3,
      epic: 4,
      legendary: 5,
    }
    return rarityMap[rarity || "common"] || 1
  }

  const executeTransaction = (tx: Transaction) =>
    new Promise<string>((resolve, reject) => {
      signAndExecute(
        { transaction: tx as any },
        {
          onError: (error) => reject(error),
          onSuccess: ({ digest }) => resolve(digest),
        }
      )
    })

  const testMint = async () => {
    if (!isConnected || !account) {
      toast({
        title: t("create.toasts.wallet_not_connected"),
        description: t("create.toasts.connect_first"),
        variant: "destructive"
      })
      return
    }

    if (!CONTRACT_ADDRESSES.PACKAGE_ID || !CONTRACT_ADDRESSES.NFT_COUNT_ID || !CONTRACT_ADDRESSES.LAND_REGISTRY_ID || !CONTRACT_ADDRESSES.LAND_REGISTRY_ADDRESS_ID) {
      toast({
        title: t("create.toasts.contract_error"),
        description: t("create.toasts.configure_contract"),
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      // Get latest checkpoint
      let checkpoint = await suiClient.getLatestCheckpointSequenceNumber()
      console.log("Latest Checkpoint Sequence Number:", checkpoint)

      // Get NFT Count object to check version
      const nftCount = await suiClient.getObject({ 
        id: CONTRACT_ADDRESSES.NFT_COUNT_ID,
        options: { showContent: true }
      })
      console.log("NFT Count:", nftCount)

      // Upload image to Supabase first
      let imageUrl = ""
      console.log("Tokenization data before upload:", tokenizationData)
      console.log("Images array:", tokenizationData.images)
      console.log("Images length:", tokenizationData.images?.length)
      console.log("First image type:", tokenizationData.images?.[0]?.constructor?.name)
      console.log("First image:", tokenizationData.images?.[0])
      
      if (tokenizationData.images && tokenizationData.images.length > 0 && tokenizationData.images[0] instanceof File) {
        toast({
          title: t("create.toasts.uploading"),
          description: t("create.toasts.upload_wait"),
        })
        try {
          imageUrl = await uploadImageToSupabase(tokenizationData.images[0])
          console.log("Image uploaded to Supabase:", imageUrl)
          toast({
            title: t("create.toasts.upload_success"),
            description: t("create.toasts.upload_success_desc"),
          })
        } catch (error: any) {
          console.error("Failed to upload image:", error)
          throw new Error(`Failed to upload image: ${error.message}`)
        }
      } else {
        // If no File object, check if we have a URL (already uploaded)
        if (tokenizationData.images && tokenizationData.images.length > 0 && typeof tokenizationData.images[0] === 'string') {
          imageUrl = tokenizationData.images[0] as string
          console.log("Using existing image URL:", imageUrl)
        } else {
          console.error("No valid image found. Tokenization data:", tokenizationData)
          throw new Error("No image provided. Please go back and upload an image first.")
        }
      }

      // Validate contract addresses
      console.log("Contract Package ID:", CONTRACT_ADDRESSES.PACKAGE_ID)
      console.log("Contract Module:", CONTRACT_MODULE)
      console.log("NFT Count ID:", CONTRACT_ADDRESSES.NFT_COUNT_ID)
      console.log("Land Registry ID:", CONTRACT_ADDRESSES.LAND_REGISTRY_ID)
      console.log("Land Registry Address ID:", CONTRACT_ADDRESSES.LAND_REGISTRY_ADDRESS_ID)
      
      if (!CONTRACT_ADDRESSES.PACKAGE_ID || CONTRACT_ADDRESSES.PACKAGE_ID === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        throw new Error("Invalid contract package ID. Please check deployment-info.json")
      }

      // Create mint transaction using the new contract signature
      // mint_nft(url: String, nftCount: &NftCount, registory: &mut LandRegistry, landRegistryAddress: &mut LandRegistryAddress, ctx: &mut TxContext)
      // Reference: finalproofpack.txt line 184 - one client call command
      // Package: 0x02c23edcb0cc861f892d22776d83e21e5b6a953c17e6b2011b5721b608c6fc64
      // Module: animetranferprotocolnew
      const tx = new Transaction()
      
      tx.moveCall({
        package: CONTRACT_ADDRESSES.PACKAGE_ID,
        module: CONTRACT_MODULE,
        function: "mint_nft",
        arguments: [
          tx.pure.string(imageUrl),
          // Use tx.object() for shared objects - SDK will automatically detect and handle shared objects
          tx.object(CONTRACT_ADDRESSES.NFT_COUNT_ID), // &NftCount (read-only shared)
          tx.object(CONTRACT_ADDRESSES.LAND_REGISTRY_ID), // &mut LandRegistry (mutable shared)
          tx.object(CONTRACT_ADDRESSES.LAND_REGISTRY_ADDRESS_ID), // &mut LandRegistryAddress (mutable shared)
        ],
      })

      console.log("Processing Mint Transaction")
      const mintDigest = await executeTransaction(tx)
      console.log("Mint Transaction Result:", mintDigest)

      const mintResult = await suiClient.waitForTransaction({
        digest: mintDigest,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      })
      console.log("Mint Transaction Result:", mintResult)

      // Extract NFT ID from created objects
      let nftId = ""
      const nftObject = mintResult.objectChanges?.find(
        (obj: any) => obj.type === "created" && obj.objectType?.includes("LandData")
      )
      
      // The SuiObjectChange type usually has objectId on 'created' or 'mutated' changes
      // We cast to any or check properties carefully
      if (nftObject && 'objectId' in nftObject) {
        nftId = (nftObject as any).objectId
      }

      if (!nftId) {
        throw new Error("Failed to retrieve minted NFT object ID from transaction result")
      }

      const metadata = {
        attributes: tokenizationData.attributes,
        verification: tokenizationData.physicalVerification,
      }

      await saveMintedNFT({
        nft_object_id: nftId,
        name: tokenizationData.itemName || "Anime NFT",
        description: tokenizationData.description || "",
        image_url: imageUrl,
        category: (tokenizationData.category as string) || "other",
        rarity: (tokenizationData.rarity as string) || "common",
        series: tokenizationData.attributes?.series || "",
        character: tokenizationData.attributes?.character || "",
        manufacturer: tokenizationData.attributes?.manufacturer,
        release_year: tokenizationData.attributes?.releaseYear
          ? Number(tokenizationData.attributes.releaseYear)
          : undefined,
        creator_address: account.address,
        owner_address: account.address,
        status: "minted",
        mint_tx_digest: mintDigest,
      })

      await logTransaction({
        nft_object_id: nftId,
        type: "mint",
        tx_digest: mintDigest,
        actor_address: account.address,
      })

      console.log("NFT ID:", nftId)
      console.log("Transaction Hash:", mintDigest)
      console.log("View on Explorer:", `https://onescan.cc/${currentNetwork}/transactionBlocksDetail?digest=${mintDigest}`)

      // Set minted NFT data
      setMintedNFT({
        id: nftId,
        name: tokenizationData.itemName || "Anime NFT",
        transactionHash: mintDigest,
        tokenId: Math.floor(Math.random() * 10000),
      })

      toast({
        title: t("create.toasts.mint_success"),
        description: t("create.toasts.mint_success_desc").replace("{url}", `https://onescan.cc/${currentNetwork}/transactionBlocksDetail?digest=${mintDigest}`),
      })

      reset()
      console.log("Tx Successful!")
      handleNext()
    } catch (error: any) {
      console.error("Minting failed:", error)
      toast({
        title: t("create.toasts.mint_failed"),
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Alias for backward compatibility
  const handleMintNFT = testMint

  const steps = [
    { id: 1, name: t("create.steps.1.name"), description: t("create.steps.1.desc") },
    { id: 2, name: t("create.steps.2.name"), description: t("create.steps.2.desc") },
    { id: 3, name: t("create.steps.3.name"), description: t("create.steps.3.desc") },
    { id: 4, name: t("create.steps.4.name"), description: t("create.steps.4.desc") },
  ]

  const progress = (currentStep / steps.length) * 100

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container px-4 mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="h-4 w-4 mr-2" />
            {t("create.hero.badge")}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{t("create.hero.title")}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("create.hero.description")}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep > step.id
                      ? "bg-primary border-primary text-primary-foreground"
                      : currentStep === step.id
                        ? "border-primary text-primary"
                        : "border-muted-foreground text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 md:w-24 h-0.5 mx-2 ${currentStep > step.id ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 1 && <FileText className="h-5 w-5" />}
              {currentStep === 2 && <Camera className="h-5 w-5" />}
              {currentStep === 3 && <Upload className="h-5 w-5" />}
              {currentStep === 4 && <Sparkles className="h-5 w-5" />}
              {steps[currentStep - 1]?.name}
            </CardTitle>
            <CardDescription>{steps[currentStep - 1]?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === 1 && <TokenizationForm onSubmit={handleFormSubmit} initialData={tokenizationData} />}
            {currentStep === 2 && (
              <TokenizationForm onSubmit={handleFormSubmit} initialData={tokenizationData} step="verification" />
            )}
            {currentStep === 3 && (
              <TokenizationPreview data={tokenizationData} onConfirm={handleMintNFT} isLoading={isMinting} />
            )}
            {currentStep === 4 && <TokenizationSuccess nft={mintedNFT} />}
          </CardContent>
        </Card>

        {/* Navigation */}
        {currentStep < 4 && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center gap-2 bg-transparent"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("create.nav.previous")}
            </Button>
            <div className="text-sm text-muted-foreground">
              {t("create.nav.step_indicator")
                .replace("{current}", currentStep.toString())
                .replace("{total}", steps.length.toString())}
            </div>
            <div className="w-24" /> {/* Spacer for alignment */}
          </div>
        )}
      </div>
    </div>
  )
}
