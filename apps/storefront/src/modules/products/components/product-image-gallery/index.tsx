"use client"

import { useState } from "react"
import Image from "next/image"

import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"

type ProductImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  title: string
}

const ProductImageGallery = ({ images, title }: ProductImageGalleryProps) => {
  const galleryImages =
    images.length > 0
      ? images
      : [{ id: "placeholder", url: null } as HttpTypes.StoreProductImage]

  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = galleryImages[activeIndex] ?? galleryImages[0]

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-neutral-100 bg-neutral-50 shadow-sm">
        {activeImage?.url ? (
          <Image
            src={activeImage.url}
            alt={title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
            No image
          </div>
        )}
      </div>

      {galleryImages.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {galleryImages.map((image, index) => (
            <button
              key={image.id ?? index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={clx(
                "relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200",
                index === activeIndex
                  ? "border-brand-pink shadow-md shadow-brand-pink/20"
                  : "border-neutral-100 opacity-80 hover:border-brand-pink/40 hover:opacity-100"
              )}
              aria-label={`View image ${index + 1}`}
            >
              {image.url && (
                <Image
                  src={image.url}
                  alt={`${title} thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProductImageGallery
