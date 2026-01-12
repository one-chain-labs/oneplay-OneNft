"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heart, Share2, ExternalLink, Clock, Eye, TrendingUp, Shield, Award, User, Tag, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@onelabs/dapp-kit"
import { useOneWallet } from "@/lib/wallet"
import { createPurchaseTransaction } from "@/lib/nft-operations"
import { getExplorerUrl } from "@/lib/onelabs"
import {
  fetchNFTByObjectId,
  fetchNFTById,
  fetchTransactionsForNft,
  logTransaction,
  markNFTPurchased,
  type NftRecord,
  type NftTransactionRecord,
} from "@/lib/nft-repository"
import type { AnimeNFT } from "@/lib/types"
import { useLanguage } from "@/components/providers/language-provider"

export default function NFTDetailPage() {
  const { t } = useLanguage()
  const params = useParams<{ id: string }>()
  const [isLiked, setIsLiked] = useState(false)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [nftRecord, setNftRecord] = useState<NftRecord | null>(null)
  const [transactions, setTransactions] = useState<NftTransactionRecord[]>([])
  const { toast } = useToast()
  const account = useCurrentAccount()
  const { mutate: signAndExecute, isPending: isTransactionPending } = useSignAndExecuteTransaction()
  const suiClient = useSuiClient()
  const { isConnected } = useOneWallet()

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!params?.id) {
        setIsLoading(false)
        return
      }
      console.log("Fetching NFT by ID:", params.id)
      try {
        // Try fetching by object ID first, then by Supabase ID
        let record = await fetchNFTByObjectId(params.id as string)
        if (!record) {
          record = await fetchNFTById(params.id as string)
        }
        console.log("Fetched NFT record:", record)
        if (record) {
          const txs = await fetchTransactionsForNft(record.nft_object_id)
          if (mounted) {
            setNftRecord(record)
            setTransactions(txs)
          }
        } else if (mounted) {
          setNftRecord(null)
          setTransactions([])
        }
      } catch (error) {
        console.error("Failed to fetch NFT data:", error)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [params?.id])

  const nft: AnimeNFT | null = useMemo(() => {
    if (!nftRecord) return null
    return {
      id: nftRecord.nft_object_id,
      name: nftRecord.name,
      description: nftRecord.description || "",
      imageUrl: nftRecord.image_url || "/placeholder.svg",
      category: (nftRecord.category as AnimeNFT["category"]) || "other",
      rarity: (nftRecord.rarity as AnimeNFT["rarity"]) || "common",
      creator: nftRecord.creator_address,
      owner: nftRecord.owner_address,
      price: nftRecord.listing_price_oct || nftRecord.price_oct || undefined,
      isListed: nftRecord.status === "listed",
      createdAt: nftRecord.created_at || "",
      attributes: {
        series: nftRecord.series || t("nft_detail.attributes.series"),
        character: nftRecord.character || t("nft_detail.attributes.character"),
        manufacturer: nftRecord.manufacturer || undefined,
        releaseYear: nftRecord.release_year || undefined,
        condition: nftRecord.condition || undefined,
      },
    }
  }, [nftRecord, t])

  const listingId = nftRecord?.listing_id || ""

  const formatDate = (value?: string) => {
    if (!value) return "—"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "—"
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const shortenId = (value: string, chars = 6) => {
    if (!value) return ""
    return `${value.slice(0, chars)}...${value.slice(-chars)}`
  }

  const handlePurchase = async () => {
    if (!isConnected || !account) {
      toast({
        title: t("nft_detail.toasts.wallet_not_connected"),
        description: t("nft_detail.toasts.connect_first"),
        variant: "destructive",
      })
      return
    }

    if (!listingId || !nftRecord) {
      toast({
        title: t("nft_detail.toasts.listing_not_found"),
        description: t("nft_detail.toasts.not_listed"),
        variant: "destructive",
      })
      return
    }

    setIsPurchasing(true)

    try {
      const nftObjectId = nftRecord.nft_object_id || (params?.id as string) || ""
      if (!nftObjectId) {
        throw new Error(t("nft_detail.toasts.object_id_error"))
      }

      const tx = createPurchaseTransaction(listingId)

      const digest = await new Promise<string>((resolve, reject) => {
        signAndExecute(
          { transaction: tx as any },
          {
            onError: (error) => reject(error),
            onSuccess: ({ digest }) => resolve(digest),
          },
        )
      })

      await suiClient.waitForTransaction({
        digest,
        options: { showEffects: true, showObjectChanges: true },
      })

      await markNFTPurchased(nftObjectId, {
        owner_address: account.address,
        purchase_tx_digest: digest,
        status: "owned",
      })

      await logTransaction({
        nft_object_id: nftObjectId,
        type: "purchase",
        tx_digest: digest,
        actor_address: account.address,
        price_oct: nftRecord.listing_price_oct || undefined,
      })

      const [record, txs] = await Promise.all([
        fetchNFTByObjectId(nftObjectId),
        fetchTransactionsForNft(nftObjectId),
      ])
      setNftRecord(record)
      setTransactions(txs)

      toast({
        title: t("nft_detail.toasts.purchase_success"),
        description: t("nft_detail.toasts.purchase_success_desc")
          .replace("{name}", nft?.name ?? "this NFT")
          .replace("{url}", getExplorerUrl("transaction", digest)),
      })
    } catch (error: any) {
      console.error("Purchase failed:", error)
      toast({
        title: t("nft_detail.toasts.purchase_failed"),
        description: error.message || t("conversation.common.error_occurred"), // assuming error_occurred might exist or fallback
        variant: "destructive",
      })
    } finally {
      setIsPurchasing(false)
    }
  }

  const handleShare = () => {
    if (navigator.share && nft) {
      navigator.share({
        title: nft.name,
        text: t("nft_detail.share.text").replace("{name}", nft.name),
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "bg-gradient-to-r from-yellow-400 to-orange-500"
      case "epic":
        return "bg-gradient-to-r from-purple-400 to-pink-500"
      case "rare":
        return "bg-gradient-to-r from-blue-400 to-cyan-500"
      case "uncommon":
        return "bg-gradient-to-r from-green-400 to-emerald-500"
      default:
        return "bg-gradient-to-r from-gray-400 to-gray-500"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("nft_detail.loading")}</div>
    )
  }

  if (!nft) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-bold">{t("nft_detail.not_found.title")}</h2>
          <p className="text-muted-foreground">{t("nft_detail.not_found.description")}</p>
          <Button asChild>
            <Link href="/marketplace">{t("nft_detail.not_found.back_button")}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container px-4 mx-auto max-w-7xl">
        <Button variant="ghost" className="mb-6" asChild>
          <Link href="/marketplace">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("nft_detail.back_link")}
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="relative">
                <img src={nft.imageUrl || "/placeholder.svg"} alt={nft.name} className="w-full aspect-square object-cover" />
                <div
                  className={`absolute top-4 left-4 px-3 py-1 rounded-full text-white text-sm font-medium ${getRarityColor(nft.rarity)}`}
                >
                  {(t(`marketplace.rarities.${nft.rarity}`) || nft.rarity).toUpperCase()}
                </div>
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setIsLiked(!isLiked)} className={isLiked ? "text-red-500" : ""}>
                    <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-3 gap-4">
              <Card className="text-center p-4">
                <div className="flex items-center justify-center mb-2">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold capitalize">{nftRecord?.status ?? "minted"}</div>
                <div className="text-sm text-muted-foreground">{t("nft_detail.status_card.status")}</div>
              </Card>
              <Card className="text-center p-4">
                <div className="flex items-center justify-center mb-2">
                  <Heart className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{transactions.length}</div>
                <div className="text-sm text-muted-foreground">{t("nft_detail.status_card.transactions")}</div>
              </Card>
              <Card className="text-center p-4">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-500">
                  {nft.price ? `${nft.price} OCT` : t("nft_detail.status_card.not_listed")}
                </div>
                <div className="text-sm text-muted-foreground">{t("nft_detail.status_card.listing_price")}</div>
              </Card>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{nft.name}</h1>
              <p className="text-muted-foreground mb-4">{nft.description}</p>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary">{t(`marketplace.categories.${nft.category}`) || nft.category}</Badge>
                <Badge variant="outline">{nft.attributes.series}</Badge>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t("nft_detail.action_card.current_price")}</span>
                  <div className="flex items-center gap-1 text-sm text-green-500">
                    <TrendingUp className="h-4 w-4" />
                    {t("nft_detail.action_card.live_listing")}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary mb-4">{nft.price ? `${nft.price} OCT` : t("nft_detail.action_card.not_listed")}</div>
                <div className="flex gap-3">
                  <Button className="flex-1" onClick={handlePurchase} disabled={isPurchasing || isTransactionPending || !listingId}>
                    {isPurchasing || isTransactionPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("nft_detail.action_card.processing")}
                      </>
                    ) : (
                      t("nft_detail.action_card.buy_now")
                    )}
                  </Button>
                  <Button variant="outline" className="bg-transparent" disabled>
                    {t("nft_detail.action_card.make_offer")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t("nft_detail.info_cards.owner")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="/placeholder.svg?height=40&width=40" />
                    <AvatarFallback>OW</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{t("nft_detail.info_cards.owner")}</div>
                    <div className="text-sm text-muted-foreground font-mono">{nft.owner}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  {t("nft_detail.info_cards.creator")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="/placeholder.svg?height=40&width=40" />
                    <AvatarFallback>CR</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{t("nft_detail.info_cards.creator")}</div>
                    <div className="text-sm text-muted-foreground font-mono">{nft.creator}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">{t("nft_detail.tabs.details")}</TabsTrigger>
            <TabsTrigger value="history">{t("nft_detail.tabs.history")}</TabsTrigger>
            <TabsTrigger value="more">{t("nft_detail.tabs.more")}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    {t("nft_detail.attributes.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t("nft_detail.attributes.series")}:</span>
                      <p className="font-medium">{nft.attributes.series}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("nft_detail.attributes.character")}:</span>
                      <p className="font-medium">{nft.attributes.character}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("nft_detail.attributes.manufacturer")}:</span>
                      <p className="font-medium">{nft.attributes.manufacturer ?? t("nft_detail.attributes.unknown")}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("nft_detail.attributes.release_year")}:</span>
                      <p className="font-medium">{nft.attributes.releaseYear ?? "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("nft_detail.attributes.condition")}:</span>
                      <p className="font-medium capitalize">{nft.attributes.condition ?? t("nft_detail.attributes.unknown")}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("nft_detail.attributes.rarity")}:</span>
                      <p className="font-medium capitalize">{t(`marketplace.rarities.${nft.rarity}`) || nft.rarity}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {t("nft_detail.blockchain.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("nft_detail.blockchain.token_id")}:</span>
                      <Button variant="link" className="px-0 h-auto font-mono text-xs" asChild>
                        <Link href={getExplorerUrl("object", nft.id)} target="_blank" rel="noopener noreferrer">
                          {shortenId(nft.id, 8)}
                        </Link>
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("nft_detail.blockchain.network")}:</span>
                      <span>{t("nft_detail.blockchain.network_name")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("nft_detail.blockchain.standard")}:</span>
                      <span>{t("nft_detail.blockchain.standard_name")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("nft_detail.blockchain.created")}:</span>
                      <span>{formatDate(nft.createdAt as string)}</span>
                    </div>
                  </div>
                  <Separator />
                  {(nftRecord?.mint_tx_digest || nftRecord?.list_tx_digest || nftRecord?.purchase_tx_digest) && (
                    <Button variant="outline" size="sm" className="w-full bg-transparent" asChild>
                      <a
                        href={getExplorerUrl("transaction", nftRecord?.mint_tx_digest || nftRecord?.list_tx_digest || nftRecord?.purchase_tx_digest || "")}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t("nft_detail.blockchain.view_explorer")}
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("nft_detail.history.title")}</CardTitle>
                <CardDescription>{t("nft_detail.history.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">{t("nft_detail.history.empty")}</div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((event) => (
                      <div key={event.tx_digest} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="p-2 bg-muted rounded-full">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="font-medium capitalize">{event.type}</span>
                            <span className="text-sm text-muted-foreground">
                              {event.created_at ? new Date(event.created_at).toLocaleString() : "—"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {t("nft_detail.history.actor")}: {shortenId(event.actor_address)}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={getExplorerUrl("transaction", event.tx_digest)} target="_blank">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="more" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("nft_detail.more_collection.title")}</CardTitle>
                <CardDescription>{t("nft_detail.more_collection.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <p>{t("nft_detail.more_collection.placeholder")}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
