"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  Plus,
  Settings,
  BarChart3,
  Grid3X3,
  List,
  Search,
  ExternalLink,
  Clock,
  Award,
} from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ListNFTDialog } from "@/components/nft/list-nft-dialog"
import { fetchOwnedNFTs, fetchTransactionsForAddress, type NftRecord, type NftTransactionRecord } from "@/lib/nft-repository"
import { useCurrentAccount } from "@onelabs/dapp-kit"
import { getExplorerUrl } from "@/lib/onelabs"
import { useLanguage } from "@/components/providers/language-provider"

export default function DashboardPage() {
  const { t } = useLanguage()
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterBy, setFilterBy] = useState("all")
  const [listDialogOpen, setListDialogOpen] = useState(false)
  const [selectedNFT, setSelectedNFT] = useState<NftRecord | null>(null)
  const [ownedNfts, setOwnedNfts] = useState<NftRecord[]>([])
  const [transactions, setTransactions] = useState<NftTransactionRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const account = useCurrentAccount()
  const walletAddress = account?.address ?? ""

  const refreshData = async () => {
    if (!walletAddress) return
    setIsLoading(true)
    try {
      const [nfts, txs] = await Promise.all([fetchOwnedNFTs(walletAddress), fetchTransactionsForAddress(walletAddress)])
      setOwnedNfts(nfts)
      setTransactions(txs)
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress])

  const derivedStats = useMemo(() => {
    const portfolioValue = ownedNfts.reduce((sum, nft) => sum + Number(nft.listing_price_oct ?? nft.price_oct ?? 0), 0)
    const listedCount = ownedNfts.filter((nft) => nft.status === "listed").length
    const totalVolume = transactions.reduce((sum, tx) => sum + Number(tx.price_oct ?? 0), 0)
    return {
      portfolioValue,
      totalNfts: ownedNfts.length,
      listedCount,
      totalVolume,
      transactionsLogged: transactions.length,
    }
  }, [ownedNfts, transactions])

  const username = walletAddress 
    ? `${t("dashboard.header.collector")} ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` 
    : t("dashboard.header.connect_prompt")
  
  // Format date consistently to avoid hydration errors
  const formatDate = (dateString?: string) => {
    if (!dateString) return "—"
    const date = new Date(dateString)
    // Use a consistent format that works the same on server and client
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${day}/${month}/${year}`
  }
  
  const joinedAt =
    transactions.length > 0 && transactions[transactions.length - 1]?.created_at
      ? formatDate(transactions[transactions.length - 1].created_at)
      : "—"

  const filteredCollection = useMemo(() => {
    return ownedNfts.filter((nft) => {
      const matchesSearch = nft.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter =
        filterBy === "all"
          ? true
          : filterBy === "listed"
            ? nft.status === "listed"
            : filterBy === "unlisted"
              ? nft.status !== "listed"
              : nft.category === filterBy
      return matchesSearch && matchesFilter
    })
  }, [ownedNfts, searchQuery, filterBy])

  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    ownedNfts.forEach((nft) => {
      const key = nft.category || "other"
      counts[key] = (counts[key] || 0) + 1
    })
    return counts
  }, [ownedNfts])

  const formatOct = (value?: number | null) => {
    if (!value || Number.isNaN(value)) return "—"
    return `${Number(value).toFixed(2)} OCT`
  }

  const handleList = (nft: NftRecord) => {
    setSelectedNFT(nft)
    setListDialogOpen(true)
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

  const getChangeColor = (change: string) => {
    return change.startsWith("+") ? "text-green-500" : "text-red-500"
  }

  const getChangeIcon = (change: string) => {
    return change.startsWith("+") ? TrendingUp : TrendingDown
  }

  // Calculate user stats
  const userStats = useMemo(() => {
    const nftsOwned = ownedNfts.length

    // Use type assertions to help typescript understand filter logic
    const nftsSold = transactions.filter((tx) => (tx.type as string) === "sale" || (tx.type as string) === "purchase").length 
    
    // Total Volume - sum of all sales/purchases
    // Note: In our current schema, 'purchase' is often the logged event for a sale completing
    const totalVolume = transactions
      .filter((tx) => tx.type === "purchase" || (tx.type as string) === "sale")
      .reduce((sum, tx) => sum + (Number(tx.price_oct) || 0), 0)

    const portfolioValue = ownedNfts
      .filter(nft => nft.status === "listed")
      .reduce((sum, nft) => sum + (Number(nft.listing_price_oct) || 0), 0)

    return {
      nftsOwned,
      nftsSold,
      totalVolume,
      portfolioValue,
      portfolioChange: "+0%", // Can be calculated from historical data if needed
      rank: 0, // Can be calculated from leaderboard if needed
    }
  }, [ownedNfts, transactions])


  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container px-4 mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="/placeholder.svg?height=100&width=100" />
              <AvatarFallback>AC</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{username}</h1>
              <p className="text-muted-foreground font-mono">{walletAddress || t("dashboard.header.connect_prompt")}</p>
              <p className="text-sm text-muted-foreground">{t("dashboard.header.member_since").replace("{date}", joinedAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="bg-transparent">
              <Settings className="h-4 w-4 mr-2" />
              {t("dashboard.header.settings")}
            </Button>
            <Button asChild>
              <Link href="/create">
                <Plus className="h-4 w-4 mr-2" />
                {t("dashboard.header.create")}
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.stats.portfolio_value")}</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{derivedStats.portfolioValue.toFixed(2)} OCT</div>
              <div className="text-xs text-muted-foreground">{t("dashboard.stats.portfolio_desc")}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.stats.nfts_owned")}</CardTitle>
              <Grid3X3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{derivedStats.totalNfts}</div>
              <p className="text-xs text-muted-foreground">{t("dashboard.stats.nfts_owned_desc")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.stats.total_volume")}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{derivedStats.totalVolume.toFixed(2)} OCT</div>
              <p className="text-xs text-muted-foreground">{t("dashboard.stats.transactions_logged").replace("{count}", derivedStats.transactionsLogged.toString())}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.stats.listed_nfts")}</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{derivedStats.listedCount}</div>
              <p className="text-xs text-muted-foreground">{t("dashboard.stats.listed_desc")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="collection" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="collection">{t("dashboard.tabs.collection")}</TabsTrigger>
            <TabsTrigger value="activity">{t("dashboard.tabs.activity")}</TabsTrigger>
            <TabsTrigger value="favorites">{t("dashboard.tabs.favorites")}</TabsTrigger>
            <TabsTrigger value="analytics">{t("dashboard.tabs.analytics")}</TabsTrigger>
          </TabsList>

          {/* My Collection Tab */}
          <TabsContent value="collection" className="mt-6">
            <div className="space-y-6">
              {/* Collection Controls */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t("dashboard.collection.search_placeholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterBy} onValueChange={setFilterBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("dashboard.collection.filters.all")}</SelectItem>
                      <SelectItem value="listed">{t("dashboard.collection.filters.listed")}</SelectItem>
                      <SelectItem value="unlisted">{t("dashboard.collection.filters.unlisted")}</SelectItem>
                      <SelectItem value="art">{t("dashboard.collection.filters.art")}</SelectItem>
                      <SelectItem value="PFP">{t("dashboard.collection.filters.PFP")}</SelectItem>
                      <SelectItem value="assets">{t("dashboard.collection.filters.assets")}</SelectItem>
                      <SelectItem value="collectibles">{t("dashboard.collection.filters.collectibles")}</SelectItem>
                      <SelectItem value="others">{t("dashboard.collection.filters.others")}</SelectItem>
                      <SelectItem value="utility">{t("dashboard.collection.filters.utility")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex border rounded-lg">
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className="rounded-r-none"
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="rounded-l-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Collection Grid/List */}
              {isLoading ? (
                <div className="text-center text-muted-foreground py-12">{t("dashboard.collection.loading")}</div>
              ) : filteredCollection.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">{t("dashboard.collection.empty")}</div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredCollection.map((nft) => (
                    <Card key={nft.nft_object_id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
                      <div className="relative">
                        <img
                          src={nft.image_url || "/placeholder.svg"}
                          alt={nft.name}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div
                          className={`absolute top-3 left-3 px-2 py-1 rounded-full text-white text-xs font-medium ${getRarityColor(
                            (nft.rarity as string) || "common",
                          )}`}
                        >
                          {(nft.rarity || "common").toUpperCase()}
                        </div>
                        {nft.status === "listed" && <Badge className="absolute top-3 right-3 bg-green-500">{t("dashboard.collection.card.listed")}</Badge>}
                      </div>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg line-clamp-1">{nft.name}</CardTitle>
                        <div className="text-sm text-muted-foreground">{t("dashboard.collection.card.minted").replace("{price}", formatOct(nft.price_oct))}</div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-sm text-muted-foreground">{t("dashboard.collection.card.current_value")}</div>
                            <div className="text-lg font-bold text-primary">
                              {formatOct(nft.listing_price_oct ?? nft.price_oct)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {nft.status === "listed" ? (
                            <Button variant="outline" size="sm" className="flex-1 bg-transparent" disabled>
                              {t("dashboard.collection.card.listed")}
                            </Button>
                          ) : (
                            <Button size="sm" className="flex-1" onClick={() => handleList(nft)} disabled={!walletAddress}>
                              {t("dashboard.collection.card.list_for_sale")}
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/marketplace/${nft.nft_object_id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCollection.map((nft) => (
                    <Card key={nft.nft_object_id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-6">
                          <div className="relative">
                            <img src={nft.image_url || "/placeholder.svg"} alt={nft.name} className="w-20 h-20 object-cover rounded-lg" />
                            <div
                              className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-white text-xs font-medium ${getRarityColor(
                                (nft.rarity as string) || "common",
                              )}`}
                            >
                              {(nft.rarity || "common").charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-semibold">{nft.name}</h3>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">{nft.category || "other"}</Badge>
                                  {nft.status === "listed" && <Badge className="bg-green-500">{t("dashboard.collection.card.listed")}</Badge>}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">{t("dashboard.collection.card.current_value")}</div>
                                <div className="text-xl font-bold text-primary">
                                  {formatOct(nft.listing_price_oct ?? nft.price_oct)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-muted-foreground">{t("dashboard.collection.card.minted").replace("{price}", formatOct(nft.price_oct))}</span>
                              </div>
                              <div className="flex gap-2">
                                {nft.status === "listed" ? (
                                  <Button variant="outline" size="sm" className="bg-transparent" disabled>
                                    {t("dashboard.collection.card.listed")}
                                  </Button>
                                ) : (
                                  <Button size="sm" onClick={() => handleList(nft)} disabled={!walletAddress}>
                                    {t("dashboard.collection.card.list_for_sale")}
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/marketplace/${nft.nft_object_id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.activity.title")}</CardTitle>
                <CardDescription>{t("dashboard.activity.desc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">{t("dashboard.activity.empty")}</div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((tx) => {
                      const Icon = getChangeIcon(tx.type === "purchase" ? "-" : "+")
                      return (
                        <div key={tx.tx_digest || Math.random().toString()} className="flex items-center gap-4 p-4 border rounded-lg">
                          <div className="p-2 bg-muted rounded-full">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="font-medium capitalize">{tx.type}</span>
                              <span className="text-sm text-muted-foreground">
                                {tx.created_at ? new Date(tx.created_at).toLocaleString() : "—"}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <Link href={`/marketplace/${tx.nft_object_id}`} className="hover:underline">
                                {t("dashboard.activity.view_nft")}
                              </Link>
                              {tx.price_oct && (
                                <span className="font-medium">
                                  {tx.price_oct} OCT
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="mt-6">
            <div className="text-center text-muted-foreground py-12">{t("dashboard.favorites.empty")}</div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.analytics.title")}</CardTitle>
                  <CardDescription>{t("dashboard.analytics.desc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-16 w-16 mx-auto mb-4" />
                      <p>{t("dashboard.analytics.placeholder")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.analytics.collection_breakdown")}</CardTitle>
                  <CardDescription>{t("dashboard.analytics.collection_breakdown_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.keys(categoryBreakdown).length === 0 ? (
                    <div className="text-sm text-muted-foreground">{t("dashboard.analytics.no_nfts")}</div>
                  ) : (
                    Object.entries(categoryBreakdown).map(([category, count]) => {
                      const percent = derivedStats.totalNfts ? Math.round((count / derivedStats.totalNfts) * 100) : 0
                      return (
                        <div key={category}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm capitalize">{category}</span>
                            <span className="text-sm font-medium">{percent}%</span>
                          </div>
                          <Progress value={percent} className="h-2" />
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>{t("dashboard.activity.recent_market")}</CardTitle>
                  <CardDescription>{t("dashboard.activity.recent_market_desc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-6">{t("dashboard.activity.no_market_activity")}</div>
                  ) : (
                    <div className="space-y-4">
                      {transactions
                        .filter((tx) => tx.type === "purchase" || (tx as any).type === "sale")
                        .map((tx) => (
                          <div key={tx.tx_digest || Math.random()} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                {tx.type === "purchase" ? (
                                  <TrendingDown className="h-5 w-5 text-red-500" />
                                ) : (
                                  <TrendingUp className="h-5 w-5 text-green-500" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium capitalize">{tx.type}</div>
                                <div className="text-sm text-muted-foreground">
                                  {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : "—"}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{tx.price_oct ? `${tx.price_oct} OCT` : "—"}</div>
                              <Link
                                href={`/marketplace/${tx.nft_object_id}`}
                                className="text-xs text-muted-foreground hover:underline"
                              >
                                {t("dashboard.activity.view_nft")}
                              </Link>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* List NFT Dialog */}
        {selectedNFT && walletAddress && (
          <ListNFTDialog
            open={listDialogOpen}
            onOpenChange={setListDialogOpen}
            nftId={selectedNFT.nft_object_id}
            nftName={selectedNFT.name}
            ownerAddress={walletAddress}
            onListed={refreshData}
          />
        )}
      </div>
    </div>
  )
}
