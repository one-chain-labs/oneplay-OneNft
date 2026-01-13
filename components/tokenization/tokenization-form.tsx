"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, Camera, FileText } from "lucide-react"
import type { TokenizationRequest } from "@/lib/types"
import { useLanguage } from "@/components/providers/language-provider"

interface TokenizationFormProps {
  onSubmit: (data: Partial<TokenizationRequest>) => void
  initialData?: Partial<TokenizationRequest>
  step?: "details" | "verification"
}

export function TokenizationForm({ onSubmit, initialData = {}, step = "details" }: TokenizationFormProps) {
  const { t } = useLanguage()
  const [formData, setFormData] = useState<Partial<TokenizationRequest>>(initialData)
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [verificationPhotos, setVerificationPhotos] = useState<File[]>([])
  const [certificates, setCertificates] = useState<File[]>([])

  const handleInputChange = (field: string, value: any) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".")
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...((prev as any)[parent] || {}),
          [child]: value,
        },
      }))
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleFileUpload = (files: FileList | null, type: "images" | "verification" | "certificates") => {
    if (!files) return

    const fileArray = Array.from(files)
    switch (type) {
      case "images":
        setUploadedImages((prev) => [...prev, ...fileArray])
        break
      case "verification":
        setVerificationPhotos((prev) => [...prev, ...fileArray])
        break
      case "certificates":
        setCertificates((prev) => [...prev, ...fileArray])
        break
    }
  }

  const removeFile = (index: number, type: "images" | "verification" | "certificates") => {
    switch (type) {
      case "images":
        setUploadedImages((prev) => prev.filter((_, i) => i !== index))
        break
      case "verification":
        setVerificationPhotos((prev) => prev.filter((_, i) => i !== index))
        break
      case "certificates":
        setCertificates((prev) => prev.filter((_, i) => i !== index))
        break
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      images: uploadedImages,
      physicalVerification: {
        photos: verificationPhotos,
        certificates: certificates,
      },
    }
    onSubmit(submitData)
  }

  if (step === "verification") {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Verification Photos */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold">{t("create.form.verification.title")}</Label>
            <p className="text-sm text-muted-foreground mb-4">
              {t("create.form.verification.desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                <Label htmlFor="verification-photos" className="cursor-pointer">
                  <span className="text-sm font-medium">{t("create.form.verification.upload_photos")}</span>
                  <Input
                    id="verification-photos"
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files, "verification")}
                  />
                </Label>
                <p className="text-xs text-muted-foreground mt-2">{t("create.form.verification.photo_reqs")}</p>
              </CardContent>
            </Card>

            <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <Label htmlFor="certificates" className="cursor-pointer">
                  <span className="text-sm font-medium">{t("create.form.verification.upload_certs")}</span>
                  <Input
                    id="certificates"
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files, "certificates")}
                  />
                </Label>
                <p className="text-xs text-muted-foreground mt-2">{t("create.form.verification.cert_desc")}</p>
              </CardContent>
            </Card>
          </div>

          {/* Uploaded Files Display */}
          {verificationPhotos.length > 0 && (
            <div>
              <Label className="text-sm font-medium">{t("create.form.verification.photos_label")} ({verificationPhotos.length})</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {verificationPhotos.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <Camera className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(index, "verification")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <p className="text-xs text-center mt-1 truncate">{file.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {certificates.length > 0 && (
            <div>
              <Label className="text-sm font-medium">{t("create.form.verification.certs_label")} ({certificates.length})</Label>
              <div className="space-y-2 mt-2">
                {certificates.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{file.name}</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index, "certificates")}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg">
          {t("create.form.buttons.continue_preview")}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="itemName">{t("create.form.item_name")} *</Label>
          <Input
            id="itemName"
            placeholder={t("create.form.item_name_placeholder")}
            value={formData.itemName || ""}
            onChange={(e) => handleInputChange("itemName", e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="description">{t("create.form.description")} *</Label>
          <Textarea
            id="description"
            placeholder={t("create.form.description_placeholder")}
            value={formData.description || ""}
            onChange={(e) => handleInputChange("description", e.target.value)}
            rows={4}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">{t("create.form.category")} *</Label>
            <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
              <SelectTrigger>
                <SelectValue placeholder={t("create.form.select_category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="art">{t("marketplace.categories.art")}</SelectItem>
                <SelectItem value="PFP">{t("marketplace.categories.PFP")}</SelectItem>
                <SelectItem value="assets">{t("marketplace.categories.assets")}</SelectItem>
                <SelectItem value="collectibles">{t("marketplace.categories.collectibles")}</SelectItem>
                <SelectItem value="utility">{t("marketplace.categories.utility")}</SelectItem>
                 <SelectItem value="media">{t("marketplace.categories.media")}</SelectItem>
                  <SelectItem value="other">{t("marketplace.categories.others")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="rarity">{t("create.form.rarity")} *</Label>
            <Select value={formData.rarity} onValueChange={(value) => handleInputChange("rarity", value)}>
              <SelectTrigger>
                <SelectValue placeholder={t("create.form.select_rarity")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="common">{t("marketplace.rarities.common")}</SelectItem>
                <SelectItem value="uncommon">{t("marketplace.rarities.uncommon")}</SelectItem>
                <SelectItem value="rare">{t("marketplace.rarities.rare")}</SelectItem>
                <SelectItem value="epic">{t("marketplace.rarities.epic")}</SelectItem>
                <SelectItem value="legendary">{t("marketplace.rarities.legendary")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Attributes */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">{t("create.form.attributes")}</Label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="series">{t("create.form.series")} *</Label>
            <Input
              id="series"
              placeholder={t("create.form.series_placeholder")}
              value={formData.attributes?.series || ""}
              onChange={(e) => handleInputChange("attributes.series", e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="character">{t("create.form.character")} *</Label>
            <Input
              id="character"
              placeholder={t("create.form.character_placeholder")}
              value={formData.attributes?.character || ""}
              onChange={(e) => handleInputChange("attributes.character", e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="manufacturer">{t("create.form.manufacturer")}</Label>
            <Input
              id="manufacturer"
              placeholder={t("create.form.manufacturer_placeholder")}
              value={formData.attributes?.manufacturer || ""}
              onChange={(e) => handleInputChange("attributes.manufacturer", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="releaseYear">{t("create.form.release_year")}</Label>
            <Input
              id="releaseYear"
              type="number"
              placeholder={t("create.form.release_year_placeholder")}
              value={formData.attributes?.releaseYear || ""}
              onChange={(e) => handleInputChange("attributes.releaseYear", Number.parseInt(e.target.value))}
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="condition">{t("create.form.condition")}</Label>
            <Select
              value={formData.attributes?.condition}
              onValueChange={(value) => handleInputChange("attributes.condition", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("create.form.select_condition")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mint">{t("create.form.conditions.mint")}</SelectItem>
                <SelectItem value="near-mint">{t("create.form.conditions.near_mint")}</SelectItem>
                <SelectItem value="good">{t("create.form.conditions.good")}</SelectItem>
                <SelectItem value="fair">{t("create.form.conditions.fair")}</SelectItem>
                <SelectItem value="poor">{t("create.form.conditions.poor")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Image Upload */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">{t("create.form.images.label")} *</Label>
          <p className="text-sm text-muted-foreground">{t("create.form.images.upload_desc")}</p>
        </div>

        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <Label htmlFor="images" className="cursor-pointer">
              <span className="text-lg font-medium">{t("create.form.images.upload_button")}</span>
              <Input
                id="images"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files, "images")}
              />
            </Label>
            <p className="text-sm text-muted-foreground mt-2">{t("create.form.images.requirements")}</p>
          </CardContent>
        </Card>

        {uploadedImages.length > 0 && (
          <div>
            <Label className="text-sm font-medium">{t("create.form.images.uploaded_label")} ({uploadedImages.length})</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              {uploadedImages.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(index, "images")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <p className="text-xs text-center mt-1 truncate">{file.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={!formData.itemName || uploadedImages.length === 0}>
        {t("create.form.buttons.continue_verification")}
      </Button>
    </form>
  )
}
