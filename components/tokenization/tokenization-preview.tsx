"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Sparkles, Eye, Tag, User, Shield } from "lucide-react"
import type { TokenizationRequest } from "@/lib/types"
import { useLanguage } from "@/components/providers/language-provider"

interface TokenizationPreviewProps {
  data: Partial<TokenizationRequest>
  onConfirm: () => void
  isLoading: boolean
}

export function TokenizationPreview({ data, onConfirm, isLoading }: TokenizationPreviewProps) {
  const { messages } = useLanguage()
  const t = messages.create.preview

  const getRarityColor = (rarity?: string) => {
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

  return (
    <div className="space-y-6">
      {/* NFT Preview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <div className="relative">
            {data.images && data.images.length > 0 ? (
              <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                {data.images[0] instanceof File ? (
                  <img
                    src={URL.createObjectURL(data.images[0])}
                    alt="NFT Preview"
                    className="w-full h-full object-cover"
                  />
                ) : typeof data.images[0] === 'string' ? (
                  <img
                    src={data.images[0]}
                    alt="NFT Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <Sparkles className="h-16 w-16 text-primary mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">{t.nft_preview.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{data.images.length} {t.nft_preview.images_uploaded}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <div className="text-center">
                  <Sparkles className="h-16 w-16 text-primary mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">{t.nft_preview.no_image}</p>
                  <p className="text-xs text-destructive mt-1">{t.nft_preview.upload_prompt}</p>
                </div>
              </div>
            )}
            <div
              className={`absolute top-4 left-4 px-3 py-1 rounded-full text-white text-sm font-medium ${getRarityColor(data.rarity)}`}
            >
              {data.rarity?.toUpperCase()}
            </div>
          </div>
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg mb-2">{data.itemName}</h3>
            <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{data.description}</p>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{data.category}</Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span>{t.nft_preview.label}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                {t.item_details.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t.item_details.series}:</span>
                  <p className="font-medium">{data.attributes?.series}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t.item_details.character}:</span>
                  <p className="font-medium">{data.attributes?.character}</p>
                </div>
                {data.attributes?.manufacturer && (
                  <div>
                    <span className="text-muted-foreground">{t.item_details.manufacturer}:</span>
                    <p className="font-medium">{data.attributes.manufacturer}</p>
                  </div>
                )}
                {data.attributes?.releaseYear && (
                  <div>
                    <span className="text-muted-foreground">{t.item_details.release_year}:</span>
                    <p className="font-medium">{data.attributes.releaseYear}</p>
                  </div>
                )}
                {data.attributes?.condition && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">{t.item_details.condition}:</span>
                    <p className="font-medium capitalize">{data.attributes.condition.replace("-", " ")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t.verification.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t.verification.photos}:</span>
                  <span className="font-medium">{data.physicalVerification?.photos?.length || 0} {t.verification.uploaded}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t.verification.certificates}:</span>
                  <span className="font-medium">{data.physicalVerification?.certificates?.length || 0} {t.verification.uploaded}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t.blockchain_details.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t.blockchain_details.network}:</span>
                <span className="font-medium">{t.blockchain_details.network_value}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t.blockchain_details.standard}:</span>
                <span className="font-medium">{t.blockchain_details.standard_value}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t.blockchain_details.minting_fee}:</span>
                <span className="font-medium">~0.1 OCT</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Confirmation */}
      <div className="text-center space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">{t.confirmation.title}</h3>
          <p className="text-muted-foreground">
            {t.confirmation.description}
          </p>
        </div>

        <Button 
          onClick={onConfirm} 
          disabled={isLoading || !data.images || data.images.length === 0} 
          size="lg" 
          className="px-8"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.confirmation.minting_button}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              {t.confirmation.mint_button}
            </>
          )}
        </Button>
        
        {(!data.images || data.images.length === 0) && (
          <p className="text-sm text-destructive text-center">
            {t.confirmation.no_image_error}
          </p>
        )}

        {isLoading && (
          <div className="text-sm text-muted-foreground space-y-1">
            <p>{t.confirmation.processing.creating}</p>
            <p>{t.confirmation.processing.wait}</p>
          </div>
        )}
      </div>
    </div>
  )
}
