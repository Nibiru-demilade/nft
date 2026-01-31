import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Wallet state
interface WalletState {
  address: string | null
  isConnected: boolean
  chainId: string | null
  setWallet: (address: string | null, chainId: string | null) => void
  disconnect: () => void
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  isConnected: false,
  chainId: null,
  setWallet: (address, chainId) =>
    set({ address, chainId, isConnected: !!address }),
  disconnect: () =>
    set({ address: null, chainId: null, isConnected: false }),
}))

// UI state
interface UIState {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  setTheme: (theme: 'light' | 'dark') => void
  toggleSidebar: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      sidebarOpen: false,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'ui-storage',
    }
  )
)

// Cart state (for bundled purchases)
interface CartItem {
  nftId: string
  collectionAddress: string
  tokenId: string
  name: string
  image: string
  price: string
  seller: string
}

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (nftId: string) => void
  clearCart: () => void
  total: () => string
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          if (state.items.find((i) => i.nftId === item.nftId)) {
            return state
          }
          return { items: [...state.items, item] }
        }),
      removeItem: (nftId) =>
        set((state) => ({
          items: state.items.filter((i) => i.nftId !== nftId),
        })),
      clearCart: () => set({ items: [] }),
      total: () => {
        const items = get().items
        return items
          .reduce((sum, item) => sum + parseFloat(item.price), 0)
          .toFixed(2)
      },
    }),
    {
      name: 'cart-storage',
    }
  )
)

// Favorites state
interface FavoritesState {
  favorites: Set<string>
  addFavorite: (nftId: string) => void
  removeFavorite: (nftId: string) => void
  isFavorite: (nftId: string) => boolean
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: new Set(),
      addFavorite: (nftId) =>
        set((state) => ({
          favorites: new Set([...state.favorites, nftId]),
        })),
      removeFavorite: (nftId) =>
        set((state) => {
          const newFavorites = new Set(state.favorites)
          newFavorites.delete(nftId)
          return { favorites: newFavorites }
        }),
      isFavorite: (nftId) => get().favorites.has(nftId),
    }),
    {
      name: 'favorites-storage',
      // Custom serialization for Set
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          const parsed = JSON.parse(str)
          return {
            ...parsed,
            state: {
              ...parsed.state,
              favorites: new Set(parsed.state.favorites),
            },
          }
        },
        setItem: (name, value) => {
          const toStore = {
            ...value,
            state: {
              ...value.state,
              favorites: [...value.state.favorites],
            },
          }
          localStorage.setItem(name, JSON.stringify(toStore))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)

// Recently viewed state
interface RecentlyViewedState {
  items: { nftId: string; viewedAt: number }[]
  addItem: (nftId: string) => void
  getRecent: (limit?: number) => string[]
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (nftId) =>
        set((state) => {
          const filtered = state.items.filter((i) => i.nftId !== nftId)
          const newItems = [{ nftId, viewedAt: Date.now() }, ...filtered].slice(
            0,
            50
          )
          return { items: newItems }
        }),
      getRecent: (limit = 10) =>
        get()
          .items.slice(0, limit)
          .map((i) => i.nftId),
    }),
    {
      name: 'recently-viewed-storage',
    }
  )
)
