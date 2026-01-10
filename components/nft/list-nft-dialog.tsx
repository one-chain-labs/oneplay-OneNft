"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@onelabs/dapp-kit"
import { useOneWallet } from "@/lib/wallet"
import { createListForSaleTransaction } from "@/lib/nft-operations"
import { Loader2 } from "lucide-react"
import { getExplorerUrl } from "@/lib/onelabs"
import { logTransaction, markNFTListed } from "@/lib/nft-repository"
import { useLanguage } from "@/components/providers/language-provider"

interface ListNFTDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nftId: string
  nftName: string
  ownerAddress: string
  onListed?: () => void
}

export function ListNFTDialog({ open, onOpenChange, nftId, nftName, ownerAddress, onListed }: ListNFTDialogProps) {
  const [price, setPrice] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const account = useCurrentAccount()
  const { mutate: signAndExecute, isPending: isTransactionPending } = useSignAndExecuteTransaction()
  const suiClient = useSuiClient()
  const { isConnected } = useOneWallet()
  const { messages } = useLanguage()
  const t = (messages.nft_detail as any).list_dialog

  if (!t) return null

  const handleList = async () => {
    if (!isConnected || !account) {
      toast({
        title: t.toasts.wallet_not_connected,
        description: t.toasts.connect_first,
        variant: "destructive",
      })
      return
    }

    if (!ownerAddress) {
      toast({
        title: t.toasts.missing_owner,
        description: t.toasts.missing_owner_desc,
        variant: "destructive",
      })
      return
    }

    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({
        title: t.toasts.invalid_price,
        description: t.toasts.invalid_price_desc,
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const tx = createListForSaleTransaction(nftId, priceNum)

      const digest = await new Promise<string>((resolve, reject) => {
        signAndExecute(
          { transaction: tx as any },
          {
            onError: (error) => reject(error),
            onSuccess: ({ digest }) => resolve(digest),
          }
        )
      })

      const result = await suiClient.waitForTransaction({
        digest,
        options: { showEffects: true, showObjectChanges: true },
      })

      // Find the created Listing object
      const listingObject = result.objectChanges?.find(
        (obj: any) => obj.type === "created" && obj.objectType?.includes("Listing")
      ) as any

      const listingId = listingObject?.objectId || ""
      if (!listingId) {
        throw new Error("Unable to determine Listing object ID from transaction response")
      }

      await markNFTListed(nftId, {
        listing_id: listingId,
        listing_price_oct: priceNum,
        list_tx_digest: digest,
        status: "listed",
      })

      await logTransaction({
        nft_object_id: nftId,
        type: "list",
        tx_digest: digest,
        actor_address: account?.address || "",
        price_oct: priceNum,
      })

      console.log("NFT listed successfully:", listingId)
      console.log("Transaction Hash:", digest)
      console.log("View on Explorer:", getExplorerUrl("transaction", digest))

      toast({
        title: t.toasts.success,
        description: t.toasts.success_desc.replace("{price}", priceNum.toString()).replace("{url}", getExplorerUrl("transaction", digest)),
      })

      onOpenChange(false)
      setPrice("")
      onListed?.()
    } catch (error: any) {
      console.error("Listing failed:", error)
      toast({
        title: t.toasts.failed,
        description: error.message || t.toasts.unexpected_error,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription dangerouslySetInnerHTML={{ __html: t.description.replace("{name}", nftName) }} />
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="price">{t.price_label}</Label>
            <Input
              id="price"
              type="number"
              step="0.1"
              min="0"
              placeholder={t.price_placeholder}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isLoading || isTransactionPending}
            />
            <p className="text-xs text-muted-foreground">
              {t.note}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading || isTransactionPending}>
            {t.cancel}
          </Button>
          <Button onClick={handleList} disabled={isLoading || isTransactionPending || !price}>
            {isLoading || isTransactionPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.listing_button}
              </>
            ) : (
              t.list_button
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

