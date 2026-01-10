import { createClient } from "@supabase/supabase-js"

// Use environment variables for security
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.")
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const BUCKET = "images"

/**
 * Upload an image file to Supabase storage in the merchandise folder.
 * @param file - The File object to upload
 * @returns Promise<string> - Public URL of the uploaded image
 */
export async function uploadImageToSupabase(file: File): Promise<string> {
  try {
    // Create unique filename with timestamp
    const timestamp = Date.now()
    // Sanitize filename: ASCII only, remove spaces, limit length
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(-20);
    const filename = `${timestamp}-${sanitizedName}`
    const destPath = `merchandise/${filename}`

    // Read file as array buffer
    const fileData = await file.arrayBuffer()

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(destPath, fileData, {
        contentType: file.type || "image/png",
        upsert: false,
      })

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(destPath)

    if (!urlData?.publicUrl) {
      throw new Error("Failed to get public URL for uploaded image")
    }

    return urlData.publicUrl
  } catch (error: any) {
    console.error("Error uploading image to Supabase:", error)
    throw error
  }
}

/**
 * Upload multiple images to Supabase
 * @param files - Array of File objects to upload
 * @returns Promise<string[]> - Array of public URLs
 */
export async function uploadImagesToSupabase(files: File[]): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadImageToSupabase(file))
  return Promise.all(uploadPromises)
}

