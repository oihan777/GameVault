'use client'

import { useState, useEffect } from 'react'
import { Search, Library, Play, CheckCircle, Star, Heart, Plus, Edit, Trash2, X, Loader2, Monitor, Apple, Terminal, Sparkles, Gamepad2, TrendingUp, Filter, Grid3x3, List, Download, Upload, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StarRating } from '@/components/ui/star-rating'
import { SortControls } from '@/components/ui/sort-controls'

interface Game {
  id: string
  steamId: string
  title: string
  image: string
  genres: string[]
  releaseDate: string
  steamRating?: number
  userRating: number // 0-5 stars
  status: 'Pending' | 'Playing' | 'Completed' | 'Wishlist'
  list: string
  isFavorite: boolean
  developers: string[]
  publishers: string[]
  price?: {
    currency: string
    final: number
    initial: number
    discountPercent: number
    formattedFinal: string
    formattedInitial: string
  }
  categories: string[]
  platforms: {
    windows: boolean
    mac: boolean
    linux: boolean
  }
  description: string
  isFree: boolean
}

interface SteamGame {
  steamId: string
  title: string
  image: string
  genres: string[]
  releaseDate: string
  steamRating?: number
  developers: string[]
  publishers: string[]
  price?: {
    currency: string
    final: number
    initial: number
    discountPercent: number
    formattedFinal: string
    formattedInitial: string
  }
  categories: string[]
  platforms: {
    windows: boolean
    mac: boolean
    linux: boolean
  }
  description: string
  isFree: boolean
}

interface CustomList {
  id: string
  name: string
  color: string
  createdAt: string
  updatedAt: string
}

const genreColors: { [key: string]: string } = {
  'Action': 'bg-gradient-to-r from-red-500 to-pink-500',
  'Strategy': 'bg-gradient-to-r from-purple-500 to-indigo-500',
  'RPG': 'bg-gradient-to-r from-blue-500 to-cyan-500',
  'Adventure': 'bg-gradient-to-r from-green-500 to-emerald-500',
  'Sports': 'bg-gradient-to-r from-orange-500 to-yellow-500',
  'Racing': 'bg-gradient-to-r from-pink-500 to-rose-500',
  'Simulation': 'bg-gradient-to-r from-cyan-500 to-blue-500',
  'Indie': 'bg-gradient-to-r from-yellow-500 to-orange-500',
  'Multiplayer': 'bg-gradient-to-r from-indigo-500 to-purple-500',
  'Singleplayer': 'bg-gradient-to-r from-gray-500 to-slate-500'
}

const statusColors = {
  Pending: 'bg-gradient-to-r from-gray-400 to-gray-600',
  Playing: 'bg-gradient-to-r from-blue-400 to-blue-600',
  Completed: 'bg-gradient-to-r from-green-400 to-green-600',
  Wishlist: 'bg-gradient-to-r from-yellow-400 to-orange-500'
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'title-asc' | 'title-desc' | 'rating-asc' | 'rating-desc' | 'date-asc' | 'date-desc'>('title-asc')
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [steamSearchResults, setSteamSearchResults] = useState<SteamGame[]>([])
  const [isSearchingSteam, setIsSearchingSteam] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [customLists, setCustomLists] = useState<CustomList[]>([])
  const [showCreateListDialog, setShowCreateListDialog] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListColor, setNewListColor] = useState('#6366f1')
  const [searchMode, setSearchMode] = useState(false) // New state for search mode
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // Add click outside handler for search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.search-container')) {
        // Only hide dropdown, keep search results in All Games
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset search mode when filter changes
  useEffect(() => {
    if (selectedFilter !== 'all') {
      setSearchMode(false)
      setSteamSearchResults([])
    }
  }, [selectedFilter])

  // Load games from database on mount
  useEffect(() => {
    loadGames()
    loadCustomLists()
  }, [])

  const loadGames = async () => {
    try {
      const response = await fetch('/api/games')
      if (response.ok) {
        const gamesData = await response.json()
        setGames(gamesData)
      }
    } catch (error) {
      console.error('Failed to load games:', error)
    }
  }

  const loadCustomLists = async () => {
    try {
      const response = await fetch('/api/lists')
      if (response.ok) {
        const listsData = await response.json()
        setCustomLists(listsData)
      }
    } catch (error) {
      console.error('Failed to load custom lists:', error)
    }
  }

  // Update sidebar counts when games change
  const sidebarItems = [
    { id: 'all', label: 'All Games', icon: Library, count: games.length },
    { id: 'pending', label: 'Pending', icon: Clock, count: games.filter(g => g.status === 'Pending').length },
    { id: 'playing', label: 'Playing', icon: Play, count: games.filter(g => g.status === 'Playing').length },
    { id: 'completed', label: 'Completed', icon: CheckCircle, count: games.filter(g => g.status === 'Completed').length },
    { id: 'wishlist', label: 'Wishlist', icon: Star, count: games.filter(g => g.status === 'Wishlist').length }
  ]

  const filteredGames = games.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase())
    
    let matchesFilter = false
    if (selectedFilter === 'all') {
      matchesFilter = true
    } else if (['pending', 'playing', 'completed', 'wishlist'].includes(selectedFilter)) {
      matchesFilter = game.status.toLowerCase() === selectedFilter
    } else {
      // Custom list filter
      const customList = customLists.find(list => list.id === selectedFilter)
      matchesFilter = customList ? game.list === customList.name : false
    }
    
    return matchesFilter && (selectedFilter === 'all' ? !searchQuery || !searchMode : matchesSearch)
  }).sort((a, b) => {
    switch (sortBy) {
      case 'title-asc':
        return a.title.localeCompare(b.title)
      case 'title-desc':
        return b.title.localeCompare(a.title)
      case 'rating-asc':
        return (a.userRating || 0) - (b.userRating || 0)
      case 'rating-desc':
        return (b.userRating || 0) - (a.userRating || 0)
      case 'date-asc':
        return parseInt(a.releaseDate) - parseInt(b.releaseDate)
      case 'date-desc':
        return parseInt(b.releaseDate) - parseInt(a.releaseDate)
      default:
        return 0
    }
  })

  const searchSteamGames = async (query: string) => {
    if (!query.trim()) {
      setSteamSearchResults([])
      setSearchMode(false)
      return
    }

    setIsSearchingSteam(true)
    setSearchMode(true)
    try {
      const response = await fetch(`/api/steam/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSteamSearchResults(data.games || [])
      }
    } catch (error) {
      console.error('Failed to search Steam games:', error)
    } finally {
      setIsSearchingSteam(false)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (selectedFilter === 'all') {
      searchSteamGames(value)
    }
  }

  const handleSearchFocus = () => {
    if (searchQuery.trim() && selectedFilter === 'all') {
      searchSteamGames(searchQuery)
    }
  }

  const addGameToLibrary = async (steamGame: SteamGame) => {
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(steamGame)
      })
      
      if (response.ok) {
        const newGame = await response.json()
        setGames(prev => [newGame, ...prev])
        // Remove from search results after adding
        setSteamSearchResults(prev => prev.filter(game => game.steamId !== steamGame.steamId))
      }
    } catch (error) {
      console.error('Failed to add game:', error)
    }
  }

  const createCustomList = async () => {
    if (!newListName.trim()) return
    
    try {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newListName, 
          color: newListColor 
        })
      })
      
      if (response.ok) {
        const newList = await response.json()
        setCustomLists(prev => [...prev, newList])
        setNewListName('')
        setNewListColor('#6366f1')
        setShowCreateListDialog(false)
      }
    } catch (error) {
      console.error('Failed to create list:', error)
    }
  }

  const exportLibrary = async () => {
    setIsExporting(true)
    try {
      const exportData = {
        games: games.map(game => ({
          steamId: game.steamId,
          title: game.title,
          image: game.image,
          genres: game.genres,
          releaseDate: game.releaseDate,
          steamRating: game.steamRating,
          userRating: game.userRating,
          status: game.status,
          list: game.list,
          isFavorite: game.isFavorite,
          developers: game.developers,
          publishers: game.publishers,
          price: game.price,
          categories: game.categories,
          platforms: game.platforms,
          description: game.description,
          isFree: game.isFree,
          createdAt: game.createdAt
        })),
        customLists: customLists,
        exportDate: new Date().toISOString(),
        version: '1.0'
      }
      
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `game-library-${new Date().toISOString().split('T')[0]}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.style.display = 'none'
      document.body.appendChild(linkElement)
      linkElement.click()
      document.body.removeChild(linkElement)
      
      // Show success message
      alert('Library exported successfully!')
    } catch (error) {
      console.error('Failed to export library:', error)
      alert('Failed to export library. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const importLibrary = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    setIsImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      // Validate data structure
      if (!data.games || !Array.isArray(data.games)) {
        throw new Error('Invalid file format')
      }
      
      // Import games using the two-step process: Create, then Update.
      const importPromises = data.games.map(async (gameData: any) => {
        // Check if game already exists in the current library
        const existingGame = games.find(g => g.steamId === gameData.steamId)
        if (existingGame) {
          console.log(`Skipping already imported game: ${gameData.title}`)
          return null // Skip existing games
        }
        
        // --- PASO 1: Crear el juego en la base de datos ---
        const createResponse = await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Enviamos los datos del juego. El API usará los datos básicos para crearlo.
          body: JSON.stringify(gameData)
        })
        
        if (!createResponse.ok) {
          console.error(`Failed to create game: ${gameData.title}`)
          return null
        }
        
        const newGame = await createResponse.json()
        
        // --- PASO 2: Actualizar el juego con los campos personalizados ---
        const updateResponse = await fetch(`/api/games/${newGame.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: gameData.status || 'Pending', // Usamos el valor del JSON o un defecto
            userRating: gameData.userRating || 0,
            list: gameData.list || 'None',
            isFavorite: gameData.isFavorite || false
          })
        })

        if (updateResponse.ok) {
          // Devolvemos el juego completamente actualizado
          return await updateResponse.json()
        } else {
          // Si la actualización falla, devolvemos el juego recién creado (sin datos personalizados)
          // para que al menos se añada a la biblioteca.
          console.warn(`Game created but failed to update custom data for: ${gameData.title}`)
          return newGame
        }
      })
      
      const importedGames = (await Promise.all(importPromises)).filter(Boolean)
      
      // Import custom lists (this part was already correct)
      if (data.customLists && Array.isArray(data.customLists)) {
        const listPromises = data.customLists.map(async (listData: any) => {
          const existingList = customLists.find(l => l.name === listData.name)
          if (existingList) {
            return null
          }
          
          const response = await fetch('/api/lists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: listData.name,
              color: listData.color || '#6366f1'
            })
          })
          
          if (response.ok) {
            return await response.json()
          }
          return null
        })
        
        const importedLists = (await Promise.all(listPromises)).filter(Boolean)
        setCustomLists(prev => [...prev, ...importedLists])
      }
      
      setGames(prev => [...prev, ...importedGames])
      
      alert(`Successfully imported ${importedGames.length} games!`)
    } catch (error) {
      console.error('Failed to import library:', error)
      alert('Failed to import library. Please check the file format and try again.')
    } finally {
      setIsImporting(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleStatusChange = async (gameId: string, newStatus: Game['status']) => {
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (response.ok) {
        setGames(prev => prev.map(game => 
          game.id === gameId ? { ...game, status: newStatus } : game
        ))
      }
    } catch (error) {
      console.error('Failed to update game status:', error)
    }
  }

  const handleRatingChange = async (gameId: string, newRating: number) => {
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRating: newRating })
      })
      
      if (response.ok) {
        setGames(prev => prev.map(game => 
          game.id === gameId ? { ...game, userRating: newRating } : game
        ))
      }
    } catch (error) {
      console.error('Failed to update game rating:', error)
    }
  }

  const handleFavoriteToggle = async (gameId: string) => {
    const game = games.find(g => g.id === gameId)
    if (!game) return
    
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !game.isFavorite })
      })
      
      if (response.ok) {
        setGames(prev => prev.map(g => 
          g.id === gameId ? { ...g, isFavorite: !g.isFavorite } : g
        ))
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const handleDeleteGame = async (gameId: string) => {
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setGames(prev => prev.filter(game => game.id !== gameId))
      }
    } catch (error) {
      console.error('Failed to delete game:', error)
    }
  }

  const handleEditGame = (game: Game) => {
    setEditingGame(game)
    setIsEditDialogOpen(true)
  }

  const saveEditedGame = async () => {
    if (!editingGame) return
    
    try {
      const response = await fetch(`/api/games/${editingGame.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: editingGame.status,
          userRating: editingGame.userRating,
          list: editingGame.list
        })
      })
      
      if (response.ok) {
        setGames(prev => prev.map(game => 
          game.id === editingGame.id ? editingGame : game
        ))
        setIsEditDialogOpen(false)
        setEditingGame(null)
      }
    } catch (error) {
      console.error('Failed to save game:', error)
    }
  }

  return (
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex zoom-[80%]">      {/* Sidebar */}
      <div className="w-72 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            Game Library
          </h1>
        </div>
        
        <nav className="space-y-1">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => setSelectedFilter(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group ${
                selectedFilter === item.id 
                  ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-white shadow-lg shadow-violet-500/10 border border-violet-500/30' 
                  : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-all duration-300 ${
                  selectedFilter === item.id 
                    ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg' 
                    : 'bg-slate-800 group-hover:bg-slate-700'
                }`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="font-medium">{item.label}</span>
              </div>
              <span className={`text-sm px-2 py-1 rounded-full transition-all duration-300 ${
                selectedFilter === item.id 
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white' 
                  : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
              }`}>
                {item.count}
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-8 pt-8 border-t border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-400">Custom Lists</h3>
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div className="space-y-1">
            {customLists.map(list => (
              <button
                key={list.id}
                onClick={() => setSelectedFilter(list.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group ${
                  selectedFilter === list.id 
                    ? 'shadow-lg border border-opacity-30' 
                    : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
                style={{
                  backgroundColor: selectedFilter === list.id ? list.color + '20' : undefined,
                  borderColor: selectedFilter === list.id ? list.color : undefined,
                  boxShadow: selectedFilter === list.id ? `0 0 20px ${list.color}30` : undefined
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full shadow-lg transition-all duration-300 group-hover:scale-110" 
                    style={{ 
                      backgroundColor: list.color,
                      boxShadow: `0 0 10px ${list.color}50`
                    }}
                  />
                  <span className="font-medium">{list.name}</span>
                </div>
                <span className="text-sm bg-slate-800/50 px-2 py-1 rounded-full group-hover:bg-slate-700/50 transition-colors">
                  {games.filter(g => g.list === list.name).length}
                </span>
              </button>
            ))}
          </div>
          <button 
            onClick={() => setShowCreateListDialog(true)}
            className="w-full flex items-center gap-3 px-4 py-3 mt-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all duration-300 group"
          >
            <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-gradient-to-br group-hover:from-violet-500 group-hover:to-purple-600 transition-all duration-300">
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
            <span className="font-medium">Create New List</span>
          </button>
          
          {/* Export/Import Section */}
          <div className="mt-6 pt-6 border-t border-slate-800/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400">Library Management</h3>
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={exportLibrary}
                disabled={isExporting || games.length === 0}
                className="flex-1 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500/20 to-emerald-600/20 hover:from-green-500/30 hover:to-emerald-600/30 text-green-400 hover:text-green-300 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <Download className={`w-4 h-4 ${isExporting ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
                <span className="text-sm font-medium">
                  {isExporting ? 'Exporting...' : 'Export'}
                </span>
              </button>
              
              <button
                disabled={isImporting}
                className="flex-1 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500/20 to-indigo-600/20 hover:from-blue-500/30 hover:to-indigo-600/30 text-blue-400 hover:text-blue-300 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <input
                  type="file"
                  accept=".json"
                  onChange={importLibrary}
                  disabled={isImporting}
                  className="hidden"
                  id="import-file-input"
                />
                <label 
                  htmlFor="import-file-input"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Upload className={`w-4 h-4 ${isImporting ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
                  <span className="text-sm font-medium">
                    {isImporting ? 'Importing...' : 'Import'}
                  </span>
                </label>
              </button>
            </div>
            
            {games.length > 0 && (
              <div className="text-xs text-slate-500 mt-2 text-center">
                {games.length} games • {customLists.length} lists
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <header className="bg-slate-900/30 backdrop-blur-xl border-b border-slate-800/50 p-6">
          <div className="max-w-4xl mx-auto relative search-container">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 group-hover:text-violet-400 transition-colors duration-300" />
              <Input
                type="text"
                placeholder={selectedFilter === 'all' ? "Search games from Steam..." : "Search your library..."}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={handleSearchFocus}
                className="pl-14 pr-14 bg-slate-800/50 backdrop-blur-sm border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 rounded-2xl h-14 text-base transition-all duration-300 shadow-lg hover:shadow-violet-500/10"
              />
              {isSearchingSteam && (
                <Loader2 className="absolute right-5 top-1/2 transform -translate-y-1/2 text-violet-400 w-5 h-5 animate-spin" />
              )}
              {!isSearchingSteam && searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSearchMode(false)
                    setSteamSearchResults([])
                  }}
                  className="absolute right-5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors duration-300"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            {/* Steam Search Results Dropdown - Only show for other filters */}
            {showSearchResults && steamSearchResults.length > 0 && selectedFilter !== 'all' && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-violet-500/10 max-h-96 overflow-y-auto z-50">
                <div className="p-3">
                  <div className="text-xs text-slate-400 px-3 py-2 font-semibold mb-2">Steam Search Results</div>
                  {steamSearchResults.map((game) => (
                    <div
                      key={game.steamId}
                      className="flex items-center gap-3 p-3 hover:bg-slate-800/50 rounded-xl cursor-pointer transition-all duration-300 group"
                      onClick={() => addGameToLibrary(game)}
                    >
                      <img
                        src={game.image}
                        alt={game.title}
                        className="w-12 h-7 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate group-hover:text-violet-400 transition-colors">
                          {game.title}
                        </div>
                        <div className="text-xs text-slate-400">
                          {game.genres.slice(0, 2).join(', ')} • {game.releaseDate}
                          {game.steamRating && ` • ${game.steamRating}/100`}
                          {game.price && !game.isFree && ` • ${game.price.formattedFinal}`}
                          {game.isFree && ' • Free'}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-gradient-to-br group-hover:from-violet-500 group-hover:to-purple-600 transition-all duration-300">
                        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Game Grid */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  {selectedFilter === 'all' ? 'All Games' : 
                   ['pending', 'playing', 'completed', 'wishlist'].includes(selectedFilter) ?
                   sidebarItems.find(item => item.id === selectedFilter)?.label || 'Search Results' :
                   customLists.find(list => list.id === selectedFilter)?.name || 'Search Results'}
                </h2>
                {selectedFilter === 'all' && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 backdrop-blur-sm rounded-full">
                    <TrendingUp className="w-4 h-4 text-violet-400" />
                    <span className="text-sm text-slate-400">{filteredGames.length} games</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <SortControls 
                  value={sortBy} 
                  onChange={setSortBy}
                  className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30"
                />
                
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
                  <Filter className="w-4 h-4 text-violet-400" />
                  <span className="text-sm text-slate-400">Filters</span>
                </div>
              </div>
            </div>
            
            {/* Show library games */}
            {filteredGames.length > 0 && (
              <div className="mb-8">
                {selectedFilter === 'all' && searchMode && (
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-6 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></div>
                    <h3 className="text-xl font-semibold text-slate-300">Your Library</h3>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredGames.map((game, index) => (
                    <Card 
  key={game.id} 
  className="group bg-slate-900/50 backdrop-blur-sm border-slate-800/50 overflow-hidden hover:shadow-2xl hover:shadow-violet-500/20 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 relative"
  style={{
    animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
  }}
>
  {/* --- BADGES SUPERIORES (Status y Favorito/Descuento) --- */}
  {/* Status Badge */}
  <div className="absolute top-3 left-3 z-10">
    <div className={`px-2 py-1 rounded-full text-xs font-medium text-white shadow-lg ${statusColors[game.status]} flex items-center gap-1`}>
      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
      {game.status}
    </div>
  </div>
  
  {/* --- NUEVO: BADGE SUPERIOR DERECHO (Favorito o Descuento) --- */}
  <div className="absolute top-3 right-3 z-10">
    {game.status === 'Wishlist' && game.price && !game.isFree ? (
      (() => {
        const discount = game.price.discountPercent || 0;
        if (discount > 50) {
          // --- DESCUENTO ALTO (Más del 50%) ---
          return (
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-600 rounded-lg blur-md opacity-75 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative px-2 py-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-lg shadow-green-500/25 border border-green-400/30">
                <span className="text-white font-bold text-sm leading-tight">-{discount}%</span>
              </div>
            </div>
          );
        } else if (discount > 0) {
          // --- DESCUENTO BAJO (Entre 1% y 50%) ---
          return (
            <div className="px-2 py-1 bg-slate-700/80 backdrop-blur-sm rounded-lg border border-slate-600/50">
              <span className="text-xs text-slate-300 font-medium">-{discount}%</span>
            </div>
          );
        } else {
          // --- SIN DESCUENTO (0%) ---
          return (
            <div className="px-2 py-1 bg-slate-800/60 backdrop-blur-sm rounded-lg border border-slate-700/50">
              <span className="text-xs text-slate-400">Full Price</span>
            </div>
          );
        }
      })()
    ) : (
      // --- FAVORITO (Solo se muestra si NO es Wishlist) ---
      game.isFavorite && (
        <div className="p-2 bg-red-500/20 backdrop-blur-sm rounded-lg border border-red-500/30">
          <Heart className="w-4 h-4 text-red-400 fill-red-400" />
        </div>
      )
    )}
  </div>
  
  <div className="relative">
    <div className="aspect-video overflow-hidden bg-slate-950">
      <img 
        src={game.image} 
        alt={game.title}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    </div>
  </div>
  
  <CardContent className="p-5">
    <h3 className="font-bold text-white mb-3 truncate group-hover:text-violet-400 transition-colors duration-300">
      {game.title}
    </h3>
    
    <div className="flex flex-wrap gap-1.5 mb-4">
      {game.genres.slice(0, 3).map(genre => (
        <Badge 
          key={genre} 
          variant="secondary" 
          className={`text-xs text-white px-2 py-1 rounded-full ${genreColors[genre] || 'bg-slate-600'} shadow-sm`}
        >
          {genre}
        </Badge>
      ))}
    </div>
    
    <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
      <span className="flex items-center gap-1">
        <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
        {game.releaseDate}
      </span>
      {game.steamRating && (
        <span className="flex items-center gap-1 text-green-400 font-medium">
          <Star className="w-3 h-3 fill-green-400" />
          {game.steamRating}
        </span>
      )}
    </div>
    
    <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
      <div className="flex gap-1">
        {game.platforms.windows && <Monitor className="w-3 h-3" />}
        {game.platforms.mac && <Apple className="w-3 h-3" />}
        {game.platforms.linux && <Terminal className="w-3 h-3" />}
      </div>
      {game.price && !game.isFree && (
        <span className="text-violet-400 font-medium">{game.price.formattedFinal}</span>
      )}
      {game.isFree && <span className="text-green-400 font-medium">Free</span>}
    </div>
    
    {game.userRating > 0 && (
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-400/10 to-orange-400/10 rounded-lg border border-yellow-400/20 mb-4">
        <div className="flex items-center gap-2">
          <StarRating 
            value={game.userRating} 
            onChange={(value) => handleRatingChange(game.id, value)}
            size="sm"
            className="scale-90"
          />
        </div>
        <span className="text-xs text-yellow-400 font-medium">
          {game.userRating}/5
        </span>
      </div>
    )}
    
    <div className="flex gap-2">
      <button
        onClick={() => handleEditGame(game)}
        className="flex-1 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-lg transition-all duration-300 group/btn"
      >
        <Edit className="w-4 h-4 mx-auto group-hover/btn:scale-110 transition-transform" />
      </button>
      <button
        onClick={() => handleFavoriteToggle(game.id)}
        className={`flex-1 px-3 py-2 rounded-lg transition-all duration-300 group/btn ${
          game.isFavorite 
            ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' 
            : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white'
        }`}
      >
        <Heart className={`w-4 h-4 mx-auto group-hover/btn:scale-110 transition-transform ${game.isFavorite ? 'fill-red-400' : ''}`} />
      </button>
      <button
        onClick={() => handleDeleteGame(game.id)}
        className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-lg transition-all duration-300 group/btn"
      >
        <Trash2 className="w-4 h-4 mx-auto group-hover/btn:scale-110 transition-transform" />
      </button>
    </div>
  </CardContent>
</Card>
                  ))}
                </div>
              </div>
            )}

            {/* Show Steam search results in All Games section */}
            {selectedFilter === 'all' && searchMode && steamSearchResults.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-6 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full"></div>
                  <h3 className="text-xl font-semibold text-slate-300">Search Results from Steam</h3>
                  <div className="flex items-center gap-2 px-3 py-1 bg-violet-500/20 backdrop-blur-sm rounded-full">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span className="text-sm text-violet-300">{steamSearchResults.length} results</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {steamSearchResults.map((game, index) => (
                    <Card 
                      key={game.steamId} 
                      className="group bg-slate-900/50 backdrop-blur-sm border-slate-800/50 overflow-hidden hover:shadow-2xl hover:shadow-violet-500/20 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 border-2 border-dashed border-slate-700/50 hover:border-violet-500/30"
                      style={{
                        animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                      }}
                    >
                      <div className="relative">
                        <div className="aspect-video overflow-hidden bg-slate-950">
                          <img 
                            src={game.image} 
                            alt={game.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        </div>
                        <div className="absolute top-3 right-3">
                          <button
                            onClick={() => addGameToLibrary(game)}
                            className="px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-medium rounded-lg shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 hover:scale-105"
                          >
                            <Plus className="w-3 h-3 inline mr-1" />
                            Add
                          </button>
                        </div>
                      </div>
                      
                      <CardContent className="p-5">
                        <h3 className="font-bold text-white mb-3 truncate group-hover:text-violet-400 transition-colors duration-300">
                          {game.title}
                        </h3>
                        
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {game.genres.slice(0, 3).map(genre => (
                            <Badge 
                              key={genre} 
                              variant="secondary" 
                              className={`text-xs text-white px-2 py-1 rounded-full ${genreColors[genre] || 'bg-slate-600'} shadow-sm`}
                            >
                              {genre}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                            {game.releaseDate}
                          </span>
                          {game.steamRating && (
                            <span className="flex items-center gap-1 text-green-400 font-medium">
                              <Star className="w-3 h-3 fill-green-400" />
                              {game.steamRating}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                          <div className="flex gap-1">
                            {game.platforms.windows && <Monitor className="w-3 h-3" />}
                            {game.platforms.mac && <Apple className="w-3 h-3" />}
                            {game.platforms.linux && <Terminal className="w-3 h-3" />}
                          </div>
                          {game.price && !game.isFree && (
                            <span className="text-violet-400 font-medium">{game.price.formattedFinal}</span>
                          )}
                          {game.isFree && <span className="text-green-400 font-medium">Free</span>}
                        </div>
                        
                        {game.description && (
                          <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                            {game.description}
                          </p>
                        )}
                        
                        <button
                          onClick={() => addGameToLibrary(game)}
                          className="w-full px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 hover:scale-[1.02] group-hover/btn:scale-105"
                        >
                          <Plus className="w-4 h-4 inline mr-2 group-hover/btn:rotate-90 transition-transform duration-300" />
                          Add to Library
                        </button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {filteredGames.length === 0 && (!searchMode || steamSearchResults.length === 0) && (
              <div className="text-center py-16">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-full blur-2xl"></div>
                  <div className="relative p-6 bg-slate-900/50 backdrop-blur-sm rounded-full border border-slate-800/50">
                    <Library className="w-16 h-16 text-slate-400" />
                  </div>
                </div>
                <p className="text-xl font-medium text-slate-300 mb-2">
                  {selectedFilter === 'all' && searchMode ? 'No games found in Steam' : 'No games found'}
                </p>
                <p className="text-sm text-slate-500">
                  {selectedFilter === 'all' && searchMode 
                    ? 'Try a different search term' 
                    : 'Try adjusting your search or filters'
                  }
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Edit Dialog */}
<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
  <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-slate-800/50 text-white max-w-md mx-auto">
    <DialogHeader className="pb-6">
      <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
        Edit Game
      </DialogTitle>
    </DialogHeader>

    {editingGame && (
      <div className="space-y-6">
        {/* 🧩 Tarjeta con imagen, título y fecha */}
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-4">
            <img 
              src={editingGame.image} 
              alt={editingGame.title}
              className="w-16 h-12 object-cover rounded-lg"
            />
            <div>
              <h3 className="font-bold text-white">{editingGame.title}</h3>
              <p className="text-sm text-slate-400">{editingGame.releaseDate}</p>
            </div>
          </div>
        </div>

        {/* 🧾 Descripción debajo de la tarjeta */}
        {editingGame.description && (
          <p className="text-sm text-slate-400 leading-relaxed bg-slate-800/40 p-3 rounded-lg border border-slate-700/40 line-clamp-5">
            {editingGame.description}
          </p>
        )}

        {/* Resto del formulario */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-300 mb-3 block flex items-center gap-2">
              <div className="w-2 h-2 bg-violet-400 rounded-full"></div>
              Status
            </label>
            <Select 
              value={editingGame.status} 
              onValueChange={(value: Game['status']) => 
                setEditingGame({...editingGame, status: value})
              }
            >
              <SelectTrigger className="bg-slate-800/50 border-slate-700/50 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900/95 backdrop-blur-xl border-slate-800/50">
                <SelectItem value="Pending" className="hover:bg-slate-800/50">Pending</SelectItem>
                <SelectItem value="Playing" className="hover:bg-slate-800/50">Playing</SelectItem>
                <SelectItem value="Completed" className="hover:bg-slate-800/50">Completed</SelectItem>
                <SelectItem value="Wishlist" className="hover:bg-slate-800/50">Wishlist</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 mb-3 block flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              Custom List
            </label>
            <Select 
              value={editingGame.list} 
              onValueChange={(value: string) => 
                setEditingGame({...editingGame, list: value})
              }
            >
              <SelectTrigger className="bg-slate-800/50 border-slate-700/50 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900/95 backdrop-blur-xl border-slate-800/50">
                <SelectItem value="None" className="hover:bg-slate-800/50">None</SelectItem>
                {customLists.map(list => (
                  <SelectItem key={list.id} value={list.name} className="hover:bg-slate-800/50">
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 mb-3 block flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              Personal Rating
            </label>
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="flex items-center justify-between mb-3">
                <StarRating 
                  value={editingGame.userRating} 
                  onChange={(value) => setEditingGame({...editingGame, userRating: value})}
                  size="lg"
                />
                <span className="text-sm text-yellow-400 font-medium">
                  {editingGame.userRating}/5 stars
                </span>
              </div>
              <div className="text-xs text-slate-500">
                Click on the stars to rate this game
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button 
            onClick={saveEditedGame}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 hover:scale-[1.02]"
          >
            Save Changes
          </button>
          <button 
            onClick={() => setIsEditDialogOpen(false)}
            className="flex-1 px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-xl transition-all duration-300 border border-slate-700/50"
          >
            Cancel
          </button>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>

      {/* Create Custom List Dialog */}
      <Dialog open={showCreateListDialog} onOpenChange={setShowCreateListDialog}>
        <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-slate-800/50 text-white max-w-md mx-auto">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-violet-400" />
              Create Custom List
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-3 block flex items-center gap-2">
                <div className="w-2 h-2 bg-violet-400 rounded-full"></div>
                List Name
              </label>
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Enter list name..."
                className="bg-slate-800/50 border-slate-700/50 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 h-12 rounded-xl text-white placeholder-slate-500"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-300 mb-3 block flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                Color
              </label>
              <div className="grid grid-cols-8 gap-3">
                {['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'].map(color => (
                  <button
                    key={color}
                    onClick={() => setNewListColor(color)}
                    className={`w-10 h-10 rounded-xl border-2 transition-all duration-300 hover:scale-110 ${
                      newListColor === color ? 'border-white shadow-lg' : 'border-slate-600 hover:border-slate-400'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button onClick={createCustomList} className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 hover:scale-[1.02]">
                Create List
              </button>
              <button 
                onClick={() => setShowCreateListDialog(false)}
                className="flex-1 px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-xl transition-all duration-300 border border-slate-700/50"
              >
                Cancel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
