"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { supabase, type InventoryItemWithCategory, type InventoryCategory } from "@/lib/supabase"
import { AlertTriangle, ArrowUp, Edit, Plus, Search, Trash, MoreVertical, Trash2, Bot, Sprout, BarChart3, RotateCcw } from "lucide-react"
import { useState, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getInventorySuggestions, getComprehensiveInventoryInsights, getSeasonalInventoryRecommendations, getInventoryOptimizationPlan, getAutoIngredientSuggestions } from "@/models/InventoryAgent"
import MarkdownRenderer from "@/components/markdown-renderer"

export default function InventoryDashboard() {
  const { toast } = useToast()

  // State
  const [inventory, setInventory] = useState<InventoryItemWithCategory[]>([])
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState<Omit<InventoryItemWithCategory, "id" | "created_at" | "updated_at" | "inventory_categories">>({
    name: "",
    category_id: 1,
    quantity: 0,
    unit: "kg",
    restock_threshold: 0,
    price: 0,
    expiry_date: undefined,
    last_restocked: undefined,
  })
  const [newCategory, setNewCategory] = useState({
    name: "",
  })
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [csvUploadOpen, setCsvUploadOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<any[]>([])
  const [csvUploading, setCsvUploading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItemWithCategory | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAll, setDeleteAll] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null)
  const [showAiSuggestions, setShowAiSuggestions] = useState(false)
  const [loadingAi, setLoadingAi] = useState(false)

  // Fetch data on component mount
  useEffect(() => {
    fetchData()

    // Set up real-time subscriptions
    const inventorySubscription = supabase
      .channel("inventory-items")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, () => {
        fetchInventory()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(inventorySubscription)
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchInventory(), fetchCategories()])
    setLoading(false)
  }

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from("inventory_items")
      .select(`
        *,
        inventory_categories (*)
      `)
      .order("name")

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch inventory items",
        variant: "destructive",
      })
    } else {
      setInventory(data || [])
    }
  }

  const fetchCategories = async () => {
    const { data, error } = await supabase.from("inventory_categories").select("*").order("name")

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      })
    } else {
      setCategories(data || [])
    }
  }

  // Add new item
  const addNewItem = async () => {
    if (!newItem.name || newItem.quantity <= 0 || newItem.restock_threshold <= 0 || newItem.price <= 0) {
      toast({
        title: "Error",
        description: "Please fill all required fields with valid values",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.from("inventory_items").insert(newItem)

      if (error) throw error

      // Reset form
      setNewItem({
        name: "",
        category_id: categories[0]?.id || 1,
        quantity: 0,
        unit: "kg",
        restock_threshold: 0,
        price: 0,
        expiry_date: undefined,
        last_restocked: undefined,
      })

      setAddItemDialogOpen(false);

      toast({
        title: "Item Added",
        description: `${newItem.name} has been added to inventory`,
      })

      fetchInventory()
    } catch (error) {
      console.error("Error adding item:", error)
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      })
    }
  }

  // Update item
  const updateItem = async () => {
    if (!editingItem) return;

    if (!newItem.name || newItem.quantity < 0 || newItem.restock_threshold < 0 || newItem.price < 0) {
      toast({
        title: "Error",
        description: "Please fill all required fields with valid values",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("inventory_items")
        .update(newItem)
        .eq("id", editingItem.id);

      if (error) throw error;

      toast({
        title: "Item Updated",
        description: `${newItem.name} has been updated.`,
      });

      setAddItemDialogOpen(false);
      setEditingItem(null);
      fetchInventory();
    } catch (error) {
      console.error("Error updating item:", error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    }
  };

  // Add new category
  const addNewCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.from("inventory_categories").insert({
        name: newCategory.name.trim(),
      })

      if (error) throw error

      // Reset form
      setNewCategory({ name: "" })
      setCategoryDialogOpen(false)

      toast({
        title: "Category Added",
        description: `${newCategory.name} category has been created`,
      })

      fetchCategories()
    } catch (error) {
      console.error("Error adding category:", error)
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      })
    }
  }

  // CSV Upload functionality
  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "text/csv") {
      setCsvFile(file)
      parseCsvFile(file)
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid CSV file",
        variant: "destructive",
      })
    }
  }

  const parseCsvFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const csv = e.target?.result as string
      const lines = csv.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      // Expected headers: name,category,quantity,unit,restock_threshold,price,expiry_date
      const expectedHeaders = ['name', 'category', 'quantity', 'unit', 'restock_threshold', 'price']
      const hasRequiredHeaders = expectedHeaders.every(h => headers.includes(h))
      
      if (!hasRequiredHeaders) {
        toast({
          title: "Invalid CSV Format",
          description: "CSV must have columns: name, category, quantity, unit, restock_threshold, price (expiry_date is optional)",
          variant: "destructive",
        })
        return
      }

      const data = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim())
        const row: any = {}
        headers.forEach((header, i) => {
          row[header] = values[i] || ''
        })
        row.rowIndex = index + 2 // +2 because we start from line 2 in CSV
        return row
      }).filter(row => row.name) // Filter out empty rows

      setCsvPreview(data)
    }
    reader.readAsText(file)
  }

  const uploadCsvData = async () => {
    if (!csvPreview.length) return
    
    setCsvUploading(true)
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    try {
      for (const row of csvPreview) {
        try {
          // Find or create category
          let categoryId = 1 // default category
          if (row.category) {
            let category = categories.find(cat => 
              cat.name.toLowerCase() === row.category.toLowerCase()
            )
               if (!category) {
            // Create new category
            const { data: newCat, error: catError } = await supabase
              .from("inventory_categories")
              .insert({ name: row.category })
              .select()
              .single()
            
            if (catError) throw catError
            category = newCat
            // Add to local categories state
            setCategories(prev => [...prev, category!])
          }
          if (category) {
            categoryId = category.id
          }
          }

          // Prepare item data
          const itemData = {
            name: row.name,
            category_id: categoryId,
            quantity: parseFloat(row.quantity) || 0,
            unit: row.unit || 'kg',
            restock_threshold: parseFloat(row.restock_threshold) || 0,
            price: parseFloat(row.price) || 0,
            expiry_date: row.expiry_date || null
          }

          // Validate required fields
          if (!itemData.name || itemData.quantity < 0 || itemData.restock_threshold < 0 || itemData.price < 0) {
            throw new Error(`Invalid data in row ${row.rowIndex}`)
          }

          const { error } = await supabase.from("inventory_items").insert(itemData)
          if (error) throw error
          
          successCount++
        } catch (error) {
          errorCount++
          errors.push(`Row ${row.rowIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Show results
      toast({
        title: "CSV Upload Complete",
        description: `Successfully uploaded ${successCount} items. ${errorCount > 0 ? `${errorCount} errors.` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default",
      })

      if (errorCount > 0 && errors.length <= 5) {
        // Show first few errors
        setTimeout(() => {
          toast({
            title: "Upload Errors",
            description: errors.slice(0, 3).join('\n'),
            variant: "destructive",
          })
        }, 1000)
      }

      // Refresh data and close dialog
      fetchInventory()
      fetchCategories()
      setCsvUploadOpen(false)
      setCsvFile(null)
      setCsvPreview([])
      
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "An unexpected error occurred during upload",
        variant: "destructive",
      })
    } finally {
      setCsvUploading(false)
    }
  }

  // Delete item
  const deleteItem = async (id: number) => {
    try {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Item Deleted",
        description: "The item has been removed from inventory",
      })

      fetchInventory()
    } catch (error) {
      console.error("Error deleting item:", error)
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  // Delete selected items
  const handleDelete = async () => {
    try {
      let itemsToDelete = deleteAll ? inventory.map((item) => item.id) : selectedItems;
      if (itemsToDelete.length === 0) return;

      const { error } = await supabase.from("inventory_items").delete().in("id", itemsToDelete);

      if (error) throw error;

      toast({
        title: "Items Deleted",
        description: `${deleteAll ? "All" : "Selected"} items have been removed from inventory`,
      });

      setSelectedItems([]);
      fetchInventory();
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting items:", error);
      toast({
        title: "Error",
        description: "Failed to delete items",
        variant: "destructive",
      });
    }
  };

  const openDeleteModal = (all: boolean) => {
    setDeleteAll(all);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteAll(false);
  };

  const handleGetAiSuggestions = async () => {
    setLoadingAi(true)
    try {
      // Get comprehensive inventory analysis
      const comprehensiveData = {
        inventoryItems: inventory,
        timeRange: "current",
        seasonalContext: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        restaurantType: "Indian Restaurant"
      };
      
      const insights = await getComprehensiveInventoryInsights(comprehensiveData);
      setAiSuggestions(insights || "No insights available.");
      setShowAiSuggestions(true);
    } catch (error) {
      console.error('Error getting inventory insights:', error);
      // Fallback to basic suggestions
      const suggestions = await getInventorySuggestions(
        "Current inventory:\n" +
          inventory.map((item) => `${item.name}: ${item.quantity}`).join("\n")
      );
      setAiSuggestions(suggestions || "No suggestions available.");
      setShowAiSuggestions(true);
    } finally {
      setLoadingAi(false)
    }
  };

  const handleGetSeasonalRecommendations = async () => {
    setLoadingAi(true)
    try {
      const seasonalInsights = await getSeasonalInventoryRecommendations();
      setAiSuggestions(seasonalInsights || "No seasonal recommendations available.");
      setShowAiSuggestions(true);
    } catch (error) {
      console.error('Error getting seasonal recommendations:', error);
      setAiSuggestions("Unable to get seasonal recommendations at this time.");
      setShowAiSuggestions(true);
    } finally {
      setLoadingAi(false)
    }
  };

  const handleGetOptimizationPlan = async () => {
    setLoadingAi(true)
    try {
      const optimizationData = {
        inventoryItems: inventory,
        timeRange: "monthly",
        seasonalContext: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
      };
      
      const optimizationPlan = await getInventoryOptimizationPlan(optimizationData);
      setAiSuggestions(optimizationPlan || "No optimization plan available.");
      setShowAiSuggestions(true);
    } catch (error) {
      console.error('Error getting optimization plan:', error);
      setAiSuggestions("Unable to generate optimization plan at this time.");
      setShowAiSuggestions(true);
    } finally {
      setLoadingAi(false)
    }
  };


  const toggleItemSelection = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Open edit item dialog
  const openEditItemDialog = (item: InventoryItemWithCategory) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      category_id: item.category_id,
      quantity: item.quantity,
      unit: item.unit,
      restock_threshold: item.restock_threshold,
      price: item.price,
      expiry_date: item.expiry_date,
      last_restocked: item.last_restocked,
    });
    setAddItemDialogOpen(true);
  };

  // Update item quantity
  const updateItemQuantity = async (id: number, quantity: number) => {
    if (quantity < 0) return

    try {
      const { error } = await supabase.from("inventory_items").update({ quantity }).eq("id", id)

      if (error) throw error

      toast({
        title: "Quantity Updated",
        description: "Inventory quantity has been updated",
      })

      fetchInventory()
    } catch (error) {
      console.error("Error updating quantity:", error)
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      })
    }
  }

  // Get stock level status
  const getStockStatus = (item: InventoryItemWithCategory) => {
    if (item.quantity <= item.restock_threshold * 0.5) {
      return "critical"
    } else if (item.quantity <= item.restock_threshold) {
      return "low"
    } else {
      return "normal"
    }
  }

  // Get expiry status
  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return "none"

    const today = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry <= 0) {
      return "expired"
    } else if (daysUntilExpiry <= 3) {
      return "soon"
    } else {
      return "good"
    }
  }

  // Filter inventory based on search query
  const filteredInventory = inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.inventory_categories?.name || "Uncategorized").toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Get low stock items
  const lowStockItems = inventory.filter((item) => item.quantity <= item.restock_threshold)

  // Get expiring items
  const expiringItems = inventory.filter((item) => item.expiry_date && getExpiryStatus(item.expiry_date) !== "good")

  // Calculate inventory value
  const inventoryValue = inventory.reduce((total, item) => total + Number(item.quantity) * Number(item.price), 0)

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading inventory...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold">Inventory Dashboard</h1>
          <p className="text-muted-foreground">Manage stock levels and inventory items</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">{inventory.length}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inventory.length} items</div>
              <p className="text-xs text-muted-foreground">
                {inventory.reduce((total, item) => total + Number(item.quantity), 0)} units in stock
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">{lowStockItems.length}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockItems.length} items</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <span className="text-amber-500 flex items-center mr-1">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                </span>
                Need restocking soon
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">{expiringItems.length}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expiringItems.length} items</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <span className="text-red-500 flex items-center mr-1">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                </span>
                Check expiry dates
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">₹</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{inventoryValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <span className="text-green-500 flex items-center mr-1">
                  <ArrowUp className="h-3 w-3 mr-1" /> 5.2%
                </span>
                from last month
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <CardTitle className="text-xl md:text-2xl">Inventory Items</CardTitle>
                <CardDescription className="mt-1">{filteredInventory.length} items found</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-grow">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search items..."
                    className="pl-8 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Dialog open={csvUploadOpen} onOpenChange={setCsvUploadOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto flex-shrink-0 text-xs sm:text-sm">
                        <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Upload CSV
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Upload Inventory Items from CSV</DialogTitle>
                        <DialogDescription>
                          Upload multiple inventory items at once using a CSV file.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="grid gap-6 py-4">
                        {/* CSV Format Instructions */}
                        <div className="bg-muted p-4 rounded-lg">
                          <h4 className="font-medium mb-2">Required CSV Format:</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Your CSV file must have the following columns (header row required):
                          </p>
                          <div className="bg-background p-2 rounded text-sm font-mono">
                            name,category,quantity,unit,restock_threshold,price,expiry_date
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p><strong>Required:</strong> name, category, quantity, unit, restock_threshold, price</p>
                            <p><strong>Optional:</strong> expiry_date (format: YYYY-MM-DD)</p>
                            <p><strong>Units:</strong> kg, liters, units, grams</p>
                          </div>
                          <div className="mt-2 bg-background p-2 rounded text-xs font-mono">
                            <div>Example:</div>
                            <div>Tomatoes,Vegetables,50,kg,10,2.50,2025-08-15</div>
                            <div>Chicken Breast,Meat,25,kg,5,8.99,2025-07-30</div>
                            <div>Salt,Spices,100,units,20,1.50,</div>
                          </div>
                        </div>

                        {/* File Upload */}
                        <div>
                          <Label htmlFor="csv-file" className="text-sm font-medium">
                            Select CSV File
                          </Label>
                          <Input
                            id="csv-file"
                            type="file"
                            accept=".csv"
                            onChange={handleCsvFileChange}
                            className="mt-1"
                          />
                        </div>

                        {/* Preview */}
                        {csvPreview.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Preview ({csvPreview.length} items)</h4>
                            <div className="border rounded-lg overflow-auto max-h-60">
                              <table className="w-full text-sm">
                                <thead className="bg-muted">
                                  <tr>
                                    <th className="p-2 text-left">Name</th>
                                    <th className="p-2 text-left">Category</th>
                                    <th className="p-2 text-left">Quantity</th>
                                    <th className="p-2 text-left">Unit</th>
                                    <th className="p-2 text-left">Threshold</th>
                                    <th className="p-2 text-left">Price</th>
                                    <th className="p-2 text-left">Expiry</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {csvPreview.slice(0, 10).map((row, index) => (
                                    <tr key={index} className="border-t">
                                      <td className="p-2">{row.name}</td>
                                      <td className="p-2">{row.category}</td>
                                      <td className="p-2">{row.quantity}</td>
                                      <td className="p-2">{row.unit}</td>
                                      <td className="p-2">{row.restock_threshold}</td>
                                      <td className="p-2">₹{row.price}</td>
                                      <td className="p-2">{row.expiry_date || 'N/A'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {csvPreview.length > 10 && (
                                <div className="p-2 text-center text-sm text-muted-foreground bg-muted">
                                  ... and {csvPreview.length - 10} more items
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setCsvUploadOpen(false)
                            setCsvFile(null)
                            setCsvPreview([])
                          }}
                          disabled={csvUploading}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={uploadCsvData} 
                          disabled={!csvPreview.length || csvUploading}
                          className="w-full sm:w-auto"
                        >
                          {csvUploading ? "Uploading..." : `Upload ${csvPreview.length} Items`}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 min-w-fit text-xs sm:text-sm"
                      onClick={handleGetAiSuggestions}
                      disabled={loadingAi}
                    >
                      {loadingAi ? (
                        <>
                          <RotateCcw className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> Generating…
                        </>
                      ) : (
                        <>
                          <Bot className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Comprehensive Analysis
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 min-w-fit text-xs sm:text-sm"
                      onClick={handleGetSeasonalRecommendations}
                      disabled={loadingAi}
                    >
                      {loadingAi ? (
                        <>
                          <RotateCcw className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> Generating…
                        </>
                      ) : (
                        <>
                          <Sprout className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Seasonal Insights
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 min-w-fit text-xs sm:text-sm"
                      onClick={handleGetOptimizationPlan}
                      disabled={loadingAi}
                    >
                      {loadingAi ? (
                        <>
                          <RotateCcw className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> Generating…
                        </>
                      ) : (
                        <>
                          <BarChart3 className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Optimization Plan
                        </>
                      )}
                    </Button>
                  </div>
                  <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto flex-shrink-0 text-xs sm:text-sm">
                        <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Add Category
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                        <DialogDescription>Create a new category for organizing inventory items.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="category-name" className="text-right">
                            Name
                          </Label>
                          <Input
                            id="category-name"
                            value={newCategory.name}
                            onChange={(e) => setNewCategory({ name: e.target.value })}
                            className="col-span-3"
                            placeholder="Enter category name"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addNewCategory()
                              }
                            }}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCategoryDialogOpen(false)} className="w-full sm:w-auto">
                          Cancel
                        </Button>
                        <Button onClick={addNewCategory} className="w-full sm:w-auto">
                          Add Category
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        className="w-full sm:w-auto flex-shrink-0 text-xs sm:text-sm"
                        onClick={() => {
                          setEditingItem(null);
                          setNewItem({
                            name: "",
                            category_id: categories[0]?.id || 1,
                            quantity: 0,
                            unit: "kg",
                            restock_threshold: 0,
                            price: 0,
                            expiry_date: undefined,
                            last_restocked: undefined,
                          });
                        }}
                      >
                        <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>{editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}</DialogTitle>
                        <DialogDescription>
                          {editingItem
                            ? "Update the details of the inventory item."
                            : "Fill in the details to add a new item to inventory."}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="sm:text-right">
                            Name
                          </Label>
                          <Input
                            id="name"
                            value={newItem.name}
                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                            className="col-span-1 sm:col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                          <Label htmlFor="category" className="sm:text-right">
                            Category
                          </Label>
                          <Select
                            value={newItem.category_id.toString()}
                            onValueChange={(value) => setNewItem({ ...newItem, category_id: Number.parseInt(value) })}
                          >
                            <SelectTrigger className="col-span-1 sm:col-span-3">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                          <Label htmlFor="quantity" className="sm:text-right">
                            Quantity
                          </Label>
                          <div className="col-span-1 sm:col-span-3 grid grid-cols-2 gap-2">
                            <Input
                              id="quantity"
                              type="number"
                              value={newItem.quantity}
                              onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                              min="0"
                            />
                            <Select value={newItem.unit} onValueChange={(value) => setNewItem({ ...newItem, unit: value })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Unit" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="liters">liters</SelectItem>
                                <SelectItem value="units">units</SelectItem>
                                <SelectItem value="grams">grams</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                          <Label htmlFor="threshold" className="sm:text-right">
                            Restock Threshold
                          </Label>
                          <Input
                            id="threshold"
                            type="number"
                            value={newItem.restock_threshold}
                            onChange={(e) => setNewItem({ ...newItem, restock_threshold: Number(e.target.value) })}
                            className="col-span-1 sm:col-span-3"
                            min="0"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                          <Label htmlFor="expiry" className="sm:text-right">
                            Expiry Date
                          </Label>
                          <Input
                            id="expiry"
                            type="date"
                            value={newItem.expiry_date || ""}
                            onChange={(e) => setNewItem({ ...newItem, expiry_date: e.target.value || undefined })}
                            className="col-span-1 sm:col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                          <Label htmlFor="price" className="sm:text-right">
                            Price
                          </Label>
                          <div className="col-span-1 sm:col-span-3 flex items-center">
                            <span className="mr-2 text-muted-foreground">₹</span>
                            <Input
                              id="price"
                              type="number"
                              value={newItem.price}
                              onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={editingItem ? updateItem : addNewItem} className="w-full sm:w-auto">
                          {editingItem ? "Update Item" : "Add Item"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4">
              <Button
                onClick={() => openDeleteModal(true)}
                variant="destructive"
                disabled={inventory.length === 0}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                <Trash2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Delete All
              </Button>
              <Button
                onClick={() => openDeleteModal(false)}
                variant="destructive"
                disabled={selectedItems.length === 0}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                <Trash2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> 
                <span className="hidden sm:inline">Delete Selected ({selectedItems.length})</span>
                <span className="sm:hidden">Delete ({selectedItems.length})</span>
              </Button>
            </div>
            <Tabs defaultValue="all">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-4">
                <TabsTrigger value="all">All Items</TabsTrigger>
                <TabsTrigger value="low">Low Stock</TabsTrigger>
                <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <InventoryList
                  items={filteredInventory}
                  onUpdate={fetchInventory}
                  onEdit={openEditItemDialog}
                  selectedItems={selectedItems}
                  onSelectItem={toggleItemSelection}
                  onDeleteItem={deleteItem}
                />
              </TabsContent>
              <TabsContent value="low">
                <InventoryList
                  items={lowStockItems}
                  onUpdate={fetchInventory}
                  onEdit={openEditItemDialog}
                  selectedItems={selectedItems}
                  onSelectItem={toggleItemSelection}
                  onDeleteItem={deleteItem}
                />
              </TabsContent>
              <TabsContent value="expiring">
                <InventoryList
                  items={expiringItems}
                  onUpdate={fetchInventory}
                  onEdit={openEditItemDialog}
                  selectedItems={selectedItems}
                  onSelectItem={toggleItemSelection}
                  onDeleteItem={deleteItem}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      {showDeleteModal && (
        <Dialog open={showDeleteModal} onOpenChange={closeDeleteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the selected inventory items.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={closeDeleteModal}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {showAiSuggestions && (
        <Dialog open={showAiSuggestions} onOpenChange={setShowAiSuggestions}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>AI Inventory Suggestions</DialogTitle>
              <DialogDescription>
                Here are some suggestions from our AI agent to help you manage your inventory.
              </DialogDescription>
            </DialogHeader>
            {aiSuggestions ? <MarkdownRenderer content={aiSuggestions} /> : (
              <div className="text-center py-8 text-muted-foreground">No suggestions available.</div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAiSuggestions(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

const InventoryList = ({
  items,
  onUpdate,
  onEdit,
  selectedItems,
  onSelectItem,
  onDeleteItem,
}: {
  items: InventoryItemWithCategory[];
  onUpdate: () => void;
  onEdit: (item: InventoryItemWithCategory) => void;
  selectedItems: number[];
  onSelectItem: (id: number) => void;
  onDeleteItem: (id: number) => void;
}) => {
  const { toast } = useToast()

  const deleteItem = async (id: number) => {
    try {
      console.log("Attempting to delete inventory item with ID:", id);
      
      // Check if item is used in menu_item_ingredients first
      const { data: usageCheck, error: checkError } = await supabase
        .from("menu_item_ingredients")
        .select("id")
        .eq("inventory_item_id", id)
        .limit(1);

      if (checkError) {
        console.error("Error checking item usage:", checkError);
        throw checkError;
      }

      if (usageCheck && usageCheck.length > 0) {
        toast({ 
          title: "Cannot Delete", 
          description: "This inventory item is used in menu recipes. Remove it from recipes first.", 
          variant: "destructive" 
        });
        return;
      }

      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      
      if (error) {
        console.error("Supabase error:", error);
        if (error.code === "23503") {
          toast({ 
            title: "Cannot Delete", 
            description: "This item is referenced by other records. Please remove dependencies first.", 
            variant: "destructive" 
          });
          return;
        }
        throw error;
      }
      
      console.log("Successfully deleted inventory item from database");
      toast({ title: "Item Deleted", description: "The item has been removed from inventory" });
      onUpdate(); // Refresh the data after deletion
      console.log("Called onUpdate to refresh data");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({ title: "Error", description: "Failed to delete item", variant: "destructive" });
    }
  }

  const updateItemQuantity = async (id: number, quantity: number) => {
    if (quantity < 0) return
    try {
      const { error } = await supabase.from("inventory_items").update({ quantity }).eq("id", id)
      if (error) throw error
      toast({ title: "Quantity Updated", description: "Inventory quantity has been updated" })
      onUpdate() // Refresh the data after quantity update
    } catch (error) {
      console.error("Error updating quantity:", error)
      toast({ title: "Error", description: "Failed to update quantity", variant: "destructive" })
    }
  }

  const getStockStatus = (item: InventoryItemWithCategory) => {
    if (item.quantity <= item.restock_threshold * 0.5) return "critical"
    if (item.quantity <= item.restock_threshold) return "low"
    return "normal"
  }

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return "none"
    const today = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntilExpiry <= 0) return "expired"
    if (daysUntilExpiry <= 3) return "soon"
    return "good"
  }

  return (
    <div>
      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-md">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3 font-semibold">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      items.forEach((item) => {
                        if (!selectedItems.includes(item.id)) {
                          onSelectItem(item.id);
                        }
                      });
                    } else {
                      items.forEach((item) => {
                        if (selectedItems.includes(item.id)) {
                          onSelectItem(item.id);
                        }
                      });
                    }
                  }}
                  checked={items.length > 0 && items.every((item) => selectedItems.includes(item.id))}
                />
              </th>
              <th className="text-left p-3 font-semibold">Name</th>
              <th className="text-left p-3 font-semibold">Category</th>
              <th className="text-left p-3 font-semibold">Quantity</th>
              <th className="text-left p-3 font-semibold">Stock Level</th>
              <th className="text-left p-3 font-semibold">Price</th>
              <th className="text-left p-3 font-semibold hidden lg:table-cell">Expiry</th>
              <th className="text-right p-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => onSelectItem(item.id)}
                    className="h-4 w-4 rounded"
                  />
                </td>
                <td className="p-3 font-medium">{item.name}</td>
                <td className="p-3">{item.inventory_categories?.name || "Uncategorized"}</td>
                <td className="p-3">{item.quantity} {item.unit}</td>
                <td className="p-3">
                  <Badge
                    variant={
                      getStockStatus(item) === "critical"
                        ? "destructive"
                        : getStockStatus(item) === "low"
                        ? "secondary"
                        : "default"
                    }
                  >
                    {getStockStatus(item)}
                  </Badge>
                </td>
                <td className="p-3 font-medium">₹{item.price.toFixed(2)}</td>
                <td className="p-3 hidden lg:table-cell">
                  <Badge
                    variant={
                      getExpiryStatus(item.expiry_date) === "expired"
                        ? "destructive"
                        : getExpiryStatus(item.expiry_date) === "soon"
                        ? "secondary"
                        : "default"
                    }
                  >
                    {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : "N/A"}
                  </Badge>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDeleteItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-3 bg-white shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2 flex-1">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => onSelectItem(item.id)}
                  className="h-4 w-4 rounded"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-gray-900 truncate">{item.name}</h3>
                  <p className="text-xs text-gray-500">{item.inventory_categories?.name || "Uncategorized"}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1 ml-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(item)} className="h-8 w-8 p-0">
                  <Edit className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDeleteItem(item.id)} className="h-8 w-8 p-0">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Quantity:</span>
                <div className="font-medium">{item.quantity} {item.unit}</div>
              </div>
              <div>
                <span className="text-gray-500">Stock:</span>
                <div className={`font-medium ${
                  getStockStatus(item) === "critical" ? "text-red-600" : 
                  getStockStatus(item) === "low" ? "text-amber-600" : "text-green-600"
                }`}>
                  {getStockStatus(item)}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Price:</span>
                <div className="font-medium">₹{item.price.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-500">Expires:</span>
                <div className={`text-xs px-1 py-0.5 rounded ${
                  getExpiryStatus(item.expiry_date) === "expired" ? "bg-red-100 text-red-800" :
                  getExpiryStatus(item.expiry_date) === "soon" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                }`}>
                  {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : "N/A"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
