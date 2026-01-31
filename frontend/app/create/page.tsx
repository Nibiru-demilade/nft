'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { useChain } from '@cosmos-kit/react'
import { Button } from '@/components/ui/button'
import { Upload, Plus, X, Loader2 } from 'lucide-react'

interface Attribute {
  trait_type: string
  value: string
}

export default function CreatePage() {
  const { isWalletConnected, openView } = useChain('nibirutestnet')
  
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [collection, setCollection] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [royalty, setRoyalty] = useState('5')
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [supply, setSupply] = useState('1')
  const [isLoading, setIsLoading] = useState(false)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile)
      const reader = new FileReader()
      reader.onload = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(droppedFile)
    }
  }, [])

  const addAttribute = () => {
    setAttributes([...attributes, { trait_type: '', value: '' }])
  }

  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index))
  }

  const updateAttribute = (index: number, field: 'trait_type' | 'value', value: string) => {
    const updated = [...attributes]
    updated[index][field] = value
    setAttributes(updated)
  }

  const handleMint = async () => {
    if (!isWalletConnected) {
      openView()
      return
    }

    if (!file || !name) {
      alert('Please provide an image and name')
      return
    }

    setIsLoading(true)
    try {
      // 1. Upload image to IPFS (mock)
      console.log('Uploading to IPFS...')
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // 2. Create metadata JSON
      const metadata = {
        name,
        description,
        image: 'ipfs://QmExample...',
        external_url: externalUrl,
        attributes: attributes.filter((a) => a.trait_type && a.value),
      }

      // 3. Upload metadata to IPFS (mock)
      console.log('Uploading metadata...')
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 4. Execute mint transaction (mock)
      console.log('Minting NFT...')
      await new Promise((resolve) => setTimeout(resolve, 2000))

      alert('NFT minted successfully!')
    } catch (error) {
      console.error('Error minting:', error)
      alert('Error minting NFT')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl md:text-4xl font-bold mb-2">Create New NFT</h1>
      <p className="text-muted-foreground mb-8">
        Create and mint your unique digital asset on Nibiru Chain
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left - Upload & Preview */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Image, Video, Audio, or 3D Model *
          </label>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`relative aspect-square rounded-2xl border-2 border-dashed transition-colors ${
              preview
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            {preview ? (
              <>
                <Image
                  src={preview}
                  alt="Preview"
                  fill
                  className="object-contain rounded-2xl"
                />
                <button
                  onClick={() => {
                    setFile(null)
                    setPreview(null)
                  }}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </>
            ) : (
              <label className="flex flex-col items-center justify-center h-full cursor-pointer">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground text-center px-4">
                  Drag and drop media or click to upload
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Max size: 100MB. Supported: JPG, PNG, GIF, SVG, MP4, WEBM, MP3, WAV, GLB
                </p>
                <input
                  type="file"
                  accept="image/*,video/*,audio/*,.glb"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Right - Form */}
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name"
              className="w-full h-11 px-4 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of your item"
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Collection */}
          <div>
            <label className="block text-sm font-medium mb-2">Collection</label>
            <select
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              className="w-full h-11 px-4 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a collection</option>
              <option value="new">+ Create new collection</option>
              <option value="cosmic">Cosmic Apes</option>
              <option value="punks">Nibiru Punks</option>
            </select>
          </div>

          {/* External URL */}
          <div>
            <label className="block text-sm font-medium mb-2">External Link</label>
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://yoursite.io/item/123"
              className="w-full h-11 px-4 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Attributes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Properties</label>
              <Button variant="ghost" size="sm" onClick={addAttribute}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {attributes.map((attr, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={attr.trait_type}
                    onChange={(e) => updateAttribute(index, 'trait_type', e.target.value)}
                    placeholder="Type"
                    className="flex-1 h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                  />
                  <input
                    type="text"
                    value={attr.value}
                    onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1 h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAttribute(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Supply & Royalty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Supply</label>
              <input
                type="number"
                min="1"
                value={supply}
                onChange={(e) => setSupply(e.target.value)}
                className="w-full h-11 px-4 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Royalty %</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={royalty}
                onChange={(e) => setRoyalty(e.target.value)}
                className="w-full h-11 px-4 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleMint}
            disabled={isLoading || !file || !name}
            className="w-full"
            variant="gradient"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create NFT'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By creating this item, you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  )
}
