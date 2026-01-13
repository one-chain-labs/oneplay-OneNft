"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Heart,
  Eye,
  TrendingUp,
  Clock,
  Sparkles,
  ShoppingBag,
  Layers,
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Wallet,
  Zap,
  Trophy,
  TrendingDown,
} from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/components/providers/language-provider"
import { useOneWallet } from "@/lib/wallet"
import { useToast } from "@/hooks/use-toast"
import type { AnimeNFT } from "@/lib/types"
import { fetchMarketplaceListings, type NftRecord } from "@/lib/nft-repository"

interface MarketplaceItem extends AnimeNFT {
  listingId?: string | null
}

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedRarities, setSelectedRarities] = useState<string[]>([])
  const [selectedStages, setSelectedStages] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState([0, 100])
  const [sortBy, setSortBy] = useState("newest")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [selectedNFT, setSelectedNFT] = useState<any>(null)
  const [showMintDialog, setShowMintDialog] = useState(false)
  const [showListDialog, setShowListDialog] = useState(false)
  const [showBuyDialog, setShowBuyDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const { t } = useLanguage()
  const { isConnected, address } = useOneWallet()
  const { toast } = useToast()

  const [nftRecords, setNftRecords] = useState<NftRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await fetchMarketplaceListings()
        if (mounted) {
          setNftRecords(data)
        }
      } catch (error) {
        console.error("Failed to load marketplace listings:", error)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const mapRecordToNFT = (record: NftRecord): MarketplaceItem => ({
    id: record.nft_object_id,
    name: record.name,
    description: record.description || "",
    imageUrl: record.image_url || "/placeholder.svg",
    category: (record.category as AnimeNFT["category"]) || "others",
    rarity: (record.rarity as AnimeNFT["rarity"]) || "common",
    creator: record.creator_address,
    owner: record.owner_address,
    price: record.listing_price_oct || record.price_oct || undefined,
    isListed: record.status === "listed",
    createdAt: record.created_at || "",
    attributes: {
      series: record.series || "Unknown Series",
      character: record.character || "Unknown Character",
      manufacturer: record.manufacturer || undefined,
      releaseYear: record.release_year || undefined,
      condition: record.condition || undefined,
    },
    listingId: record.listing_id,
  })

  const marketplaceItems = useMemo(() => nftRecords.map(mapRecordToNFT), [nftRecords])

  const categories = ["art", "PFP", "assets", "collectibles", "utility", "media", "others"]
  const rarities = ["common", "uncommon", "rare", "epic", "legendary"]
  const lifecycleStages = ["minted", "listed", "trading", "collected"]

  // Calculate marketplace stats
  const marketplaceStats = useMemo(() => {
    const totalNFTs = marketplaceItems.length
    const mintedCount = marketplaceItems.filter((n) => !n.isListed).length
    const listedCount = marketplaceItems.filter((n) => n.isListed).length
    const tradingCount = listedCount // Trading = listed items
    const collectedCount = marketplaceItems.filter((n) => !n.isListed).length
    const totalVolume = marketplaceItems.reduce((sum, nft) => sum + (nft.price || 0), 0)
    const averagePrice = totalNFTs > 0 ? totalVolume / totalNFTs : 0

    return {
      totalNFTs,
      mintedCount,
      listedCount,
      tradingCount,
      collectedCount,
      totalVolume,
      averagePrice,
    }
  }, [marketplaceItems])

  const filteredAndSortedNFTs = useMemo(() => {
    let filtered = marketplaceItems.filter((nft) => {
      const matchesSearch =
        searchQuery === "" ||
        nft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (nft.attributes.series && nft.attributes.series.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (nft.attributes.character && nft.attributes.character.toLowerCase().includes(searchQuery.toLowerCase()))

      // Tab filtering
      if (activeTab !== "all") {
        const stage = nft.isListed ? "listed" : "minted"
        if (activeTab === "trading" && nft.isListed) return matchesSearch
        if (activeTab === "collected" && !nft.isListed) return matchesSearch
        if (activeTab === stage) return matchesSearch
        if (activeTab !== stage && activeTab !== "trading" && activeTab !== "collected") return false
      }

      return matchesSearch
    })

    // Category filtering
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((nft) => selectedCategories.includes(nft.category))
    }

    // Rarity filtering
    if (selectedRarities.length > 0) {
      filtered = filtered.filter((nft) => selectedRarities.includes(nft.rarity))
    }

    // Price filtering
    filtered = filtered.filter((nft) => {
      const price = nft.price || 0
      return price >= priceRange[0] && price <= priceRange[1]
    })

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return (a.price || 0) - (b.price || 0)
        case "price-high":
          return (b.price || 0) - (a.price || 0)
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "name":
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    return filtered
  }, [marketplaceItems, searchQuery, selectedCategories, selectedRarities, priceRange, sortBy, activeTab])

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

  const getStageInfo = (stage: string) => {
    switch (stage) {
      case "minted":
        return {
          label: t("marketplace.stages.minted.label"),
          icon: Sparkles,
          color: "bg-blue-500",
          description: t("marketplace.stages.minted.desc"),
        }
      case "listed":
        return {
          label: t("marketplace.stages.listed.label"),
          icon: ShoppingBag,
          color: "bg-green-500",
          description: t("marketplace.stages.listed.desc"),
        }
      case "trading":
        return {
          label: t("marketplace.stages.trading.label"),
          icon: TrendingUp,
          color: "bg-purple-500",
          description: t("marketplace.stages.trading.desc"),
        }
      case "collected":
        return {
          label: t("marketplace.stages.collected.label"),
          icon: Trophy,
          color: "bg-yellow-500",
          description: t("marketplace.stages.collected.desc"),
        }
      default:
        return {
          label: t("marketplace.stages.unknown.label"),
          icon: Layers,
          color: "bg-gray-500",
          description: "",
        }
    }
  }

  const handleMint = async () => {
    if (!isConnected) {
      toast({
        title: t("marketplace.toasts.wallet_not_connected"),
        description: t("marketplace.toasts.connect_to_mint"),
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      // Simulate minting process
      await new Promise((resolve) => setTimeout(resolve, 2000))
      toast({
        title: t("marketplace.toasts.mint_success"),
        description: t("marketplace.toasts.mint_success_desc"),
      })
      setShowMintDialog(false)
    } catch (error) {
      toast({
        title: t("marketplace.toasts.mint_failed"),
        description: t("marketplace.toasts.mint_failed_desc"),
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleList = async (nft: any, price: number) => {
    if (!isConnected) {
      toast({
        title: t("marketplace.toasts.wallet_not_connected"),
        description: t("marketplace.toasts.connect_to_list"),
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      toast({
        title: t("marketplace.toasts.list_success"),
        description: t("marketplace.toasts.list_success_desc").replace("{price}", price.toString()),
      })
      setShowListDialog(false)
    } catch (error) {
      toast({
        title: t("marketplace.toasts.list_failed"),
        description: t("marketplace.toasts.list_failed_desc"),
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBuy = async (nft: any) => {
    if (!isConnected) {
      toast({
        title: t("marketplace.toasts.wallet_not_connected"),
        description: t("marketplace.toasts.connect_to_buy"),
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      toast({
        title: t("marketplace.toasts.buy_success"),
        description: t("marketplace.toasts.buy_success_desc")
          .replace("{name}", nft.name)
          .replace("{price}", nft.price.toString()),
      })
      setShowBuyDialog(false)
    } catch (error) {
      toast({
        title: t("marketplace.toasts.buy_failed"),
        description: t("marketplace.toasts.buy_failed_desc"),
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="container px-4 mx-auto py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">{t("marketplace.hero.badge")}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {t("marketplace.hero.title")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            {t("marketplace.hero.description")} <span className="font-semibold text-primary">{t("marketplace.hero.mint")}</span> →{" "}
            <span className="font-semibold text-green-500">{t("marketplace.hero.list")}</span> →{" "}
            <span className="font-semibold text-purple-500">{t("marketplace.hero.trade")}</span> →{" "}
            <span className="font-semibold text-yellow-500">{t("marketplace.hero.collect")}</span>
          </p>

          {/* Lifecycle Visualization */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            {[
              { stage: "minted", label: t("marketplace.hero.mint"), icon: Sparkles },
              { stage: "listed", label: t("marketplace.hero.list"), icon: ShoppingBag },
              { stage: "trading", label: t("marketplace.hero.trade"), icon: TrendingUp },
              { stage: "collected", label: t("marketplace.hero.collect"), icon: Trophy },
            ].map((item, index) => {
              const Icon = item.icon
              const info = getStageInfo(item.stage)
              return (
                <div key={item.stage} className="flex items-center gap-2">
                  <Card className="border-2 hover:border-primary transition-all cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`${info.color} rounded-full p-2`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold">{item.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {marketplaceStats[`${item.stage}Count` as keyof typeof marketplaceStats]} NFTs
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {index < 3 && (
                    <ArrowDownRight className="h-6 w-6 text-muted-foreground hidden md:block" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Marketplace Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <Card className="border-2">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{marketplaceStats.totalNFTs}</div>
                <div className="text-sm text-muted-foreground">{t("marketplace.stats.total_nfts")}</div>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-500">{marketplaceStats.listedCount}</div>
                <div className="text-sm text-muted-foreground">{t("marketplace.stats.listed")}</div>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-500">{marketplaceStats.totalVolume.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">{t("marketplace.stats.total_volume")}</div>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-500">{marketplaceStats.averagePrice.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">{t("marketplace.stats.avg_price")}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <TabsList className="grid w-full lg:w-auto grid-cols-5 bg-muted/50">
              <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                {t("marketplace.tabs.all")}
              </TabsTrigger>
              <TabsTrigger
                value="minted"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
              >
                {t("marketplace.tabs.minted")}
              </TabsTrigger>
              <TabsTrigger
                value="listed"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
              >
                {t("marketplace.tabs.listed")}
              </TabsTrigger>
              <TabsTrigger
                value="trading"
                className="data-[state=active]:bg-purple-500 data-[state=active]:text-white"
              >
                {t("marketplace.tabs.trading")}
              </TabsTrigger>
              <TabsTrigger
                value="collected"
                className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white"
              >
                {t("marketplace.tabs.collected")}
              </TabsTrigger>
            </TabsList>

            {/* Search and Controls */}
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("marketplace.filters.search_placeholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  {t("marketplace.filters.button")}
                </Button>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t("marketplace.filters.sort.newest")}</SelectItem>
                    <SelectItem value="oldest">{t("marketplace.filters.sort.oldest")}</SelectItem>
                    <SelectItem value="price-low">{t("marketplace.filters.sort.price_low")}</SelectItem>
                    <SelectItem value="price-high">{t("marketplace.filters.sort.price_high")}</SelectItem>
                    <SelectItem value="name">{t("marketplace.filters.sort.name")}</SelectItem>
                  </SelectContent>
                </Select>

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
          </div>

          {/* Filters Sidebar */}
          {showFilters && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">{t("marketplace.filters.advanced")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Categories */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">{t("marketplace.filters.category")}</Label>
                    <div className="space-y-2">
                      {categories.map((category) => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={category}
                            checked={selectedCategories.includes(category)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCategories([...selectedCategories, category])
                              } else {
                                setSelectedCategories(selectedCategories.filter((c) => c !== category))
                              }
                            }}
                          />
                          <Label htmlFor={category} className="text-sm capitalize cursor-pointer">
                            {t(`marketplace.categories.${category}`)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rarity */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">{t("marketplace.filters.rarity")}</Label>
                    <div className="space-y-2">
                      {rarities.map((rarity) => (
                        <div key={rarity} className="flex items-center space-x-2">
                          <Checkbox
                            id={rarity}
                            checked={selectedRarities.includes(rarity)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRarities([...selectedRarities, rarity])
                              } else {
                                setSelectedRarities(selectedRarities.filter((r) => r !== rarity))
                              }
                            }}
                          />
                          <Label htmlFor={rarity} className="text-sm capitalize cursor-pointer">
                            {t(`marketplace.rarities.${rarity}`)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lifecycle Stage */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">{t("marketplace.filters.stage")}</Label>
                    <div className="space-y-2">
                      {lifecycleStages.map((stage) => (
                        <div key={stage} className="flex items-center space-x-2">
                          <Checkbox
                            id={stage}
                            checked={selectedStages.includes(stage)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedStages([...selectedStages, stage])
                              } else {
                                setSelectedStages(selectedStages.filter((s) => s !== stage))
                              }
                            }}
                          />
                          <Label htmlFor={stage} className="text-sm capitalize cursor-pointer">
                            {t(`marketplace.stages.${stage}.label`)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">
                    {t("marketplace.filters.price_range")}: {priceRange[0]} - {priceRange[1]} OCT
                  </Label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={100}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Clear Filters */}
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCategories([])
                    setSelectedRarities([])
                    setSelectedStages([])
                    setPriceRange([0, 100])
                    setSearchQuery("")
                  }}
                  className="w-full"
                >
                  {t("marketplace.filters.clear_all")}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* NFT Grid/List */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground">
                {isLoading
                  ? t("marketplace.list.loading")
                  : t("marketplace.list.found_plural").replace("{count}", filteredAndSortedNFTs.length.toString())}
              </p>
              {!isConnected && (
                <Button onClick={() => toast({ title: t("marketplace.toasts.connect_to_interact") })} variant="outline">
                  <Wallet className="h-4 w-4 mr-2" />
                  {t("marketplace.list.connect_wallet")}
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-16 text-muted-foreground">{t("marketplace.list.fetching")}</div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAndSortedNFTs.map((nft) => {
                  const lifecycleStage = nft.isListed ? "listed" : "minted"
                  const stageInfo = getStageInfo(lifecycleStage)
                  const StageIcon = stageInfo.icon
                  return (
                    <Card
                      key={nft.id}
                      className="group hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 hover:border-primary/50"
                    >
                      <div className="relative">
                        <img
                          src={nft.imageUrl || "/placeholder.svg"}
                          alt={nft.name}
                          className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-full text-white text-xs font-bold ${getRarityColor(nft.rarity)}`}>
                          {t(`marketplace.rarities.${nft.rarity}`)}
                        </div>
                        <div className={`absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-medium ${stageInfo.color}`}>
                          <StageIcon className="h-3 w-3" />
                          {stageInfo.label}
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-sm">
                          <div className="flex items-center gap-1 bg-black/70 px-2 py-1 rounded-full backdrop-blur-sm">
                            <Eye className="h-3 w-3" />
                            <span>1.2k</span>
                          </div>
                          {nft.price && (
                            <div className="flex items-center gap-1 bg-black/70 px-2 py-1 rounded-full backdrop-blur-sm">
                              <TrendingUp className="h-3 w-3" />
                              <span>+12%</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg line-clamp-1">{nft.name}</CardTitle>
                        <CardDescription className="line-clamp-2">{nft.attributes.series}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {t(`marketplace.categories.${nft.category}`)}
                          </Badge>
                          {nft.price && (
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">{t("marketplace.dialogs.buy.price")}</div>
                              <div className="text-lg font-bold text-primary">{nft.price} OCT</div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            asChild
                            onClick={() => setSelectedNFT(nft)}
                          >
                            <Link href={`/marketplace/${nft.id}`}>{t("marketplace.list.view_details")}</Link>
                          </Button>
                          {nft.isListed && nft.price && (
                            <Button
                              variant="default"
                              className="bg-gradient-to-r from-primary to-purple-600"
                              onClick={() => {
                                setSelectedNFT(nft)
                                setShowBuyDialog(true)
                              }}
                            >
                              <ShoppingBag className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAndSortedNFTs.map((nft) => {
                  const lifecycleStage = nft.isListed ? "listed" : "minted"
                  const stageInfo = getStageInfo(lifecycleStage)
                  const StageIcon = stageInfo.icon
                  return (
                    <Card key={nft.id} className="hover:shadow-xl transition-shadow border-2">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-6">
                          <div className="relative">
                            <img
                              src={nft.imageUrl || "/placeholder.svg"}
                              alt={nft.name}
                              className="w-24 h-24 object-cover rounded-lg"
                            />
                            <div className={`absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs font-medium ${stageInfo.color}`}>
                              <StageIcon className="h-3 w-3" />
                              {stageInfo.label}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-semibold">{nft.name}</h3>
                                <p className="text-muted-foreground">{nft.attributes.series}</p>
                              </div>
                              {nft.price && (
                                <div className="text-right">
                                  <div className="text-sm text-muted-foreground">{t("marketplace.dialogs.buy.price")}</div>
                                  <div className="text-xl font-bold text-primary">{nft.price} OCT</div>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{nft.description}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{t(`marketplace.categories.${nft.category}`)}</Badge>
                                <Badge className={getRarityColor(nft.rarity)}>{t(`marketplace.rarities.${nft.rarity}`)}</Badge>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{t("marketplace.stages.minted.label")} {new Date(nft.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" asChild>
                                  <Link href={`/marketplace/${nft.id}`}>{t("marketplace.list.view_details")}</Link>
                                </Button>
                                {nft.isListed && nft.price && (
                                  <Button
                                    className="bg-gradient-to-r from-primary to-purple-600"
                                    onClick={() => {
                                      setSelectedNFT(nft)
                                      setShowBuyDialog(true)
                                    }}
                                  >
                                    <ShoppingBag className="h-4 w-4 mr-2" />
                                    {t("marketplace.list.buy_now")}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {filteredAndSortedNFTs.length === 0 && (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t("marketplace.list.no_results_title")}</h3>
                <p className="text-muted-foreground mb-4">
                  {t("marketplace.list.no_results_desc")}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedCategories([])
                    setSelectedRarities([])
                    setSelectedStages([])
                    setPriceRange([0, 100])
                  }}
                >
                  {t("marketplace.filters.clear_all")}
                </Button>
              </div>
            )}
          </div>
        </Tabs>
      </div>

      {/* Mint Dialog */}
      <Dialog open={showMintDialog} onOpenChange={setShowMintDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.dialogs.mint.title")}</DialogTitle>
            <DialogDescription>
              {t("marketplace.dialogs.mint.desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("marketplace.dialogs.mint.note")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMintDialog(false)}>
              {t("marketplace.dialogs.cancel")}
            </Button>
            <Button asChild>
              <Link href="/create">{t("marketplace.dialogs.mint.go_create")}</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buy Dialog */}
      <Dialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("marketplace.dialogs.buy.title")}</DialogTitle>
            <DialogDescription>
              {t("marketplace.dialogs.buy.desc")
                .replace("{name}", selectedNFT?.name || "")
                .replace("{price}", selectedNFT?.price?.toString() || "")}
            </DialogDescription>
          </DialogHeader>
          {selectedNFT && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <img
                  src={selectedNFT.imageUrl || "/placeholder.svg"}
                  alt={selectedNFT.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{selectedNFT.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedNFT.attributes.series}</p>
                  <div className="text-lg font-bold text-primary mt-1">{selectedNFT.price} OCT</div>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("marketplace.dialogs.buy.price")}</span>
                  <span className="font-medium">{selectedNFT.price} OCT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("marketplace.dialogs.buy.fee").replace("{percent}", "2.5")}</span>
                  <span className="font-medium">{(selectedNFT.price * 0.025).toFixed(2)} OCT</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">{t("marketplace.dialogs.buy.total")}</span>
                  <span className="font-bold text-primary">
                    {(selectedNFT.price * 1.025).toFixed(2)} OCT
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuyDialog(false)} disabled={isProcessing}>
              {t("marketplace.dialogs.cancel")}
            </Button>
            <Button onClick={() => handleBuy(selectedNFT)} disabled={isProcessing || !isConnected}>
              {isProcessing ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-spin" />
                  {t("marketplace.dialogs.buy.processing")}
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4 mr-2" />
                  {t("marketplace.dialogs.buy.confirm")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
