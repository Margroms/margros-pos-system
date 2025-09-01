"use client";
import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Save, X, ChefHat, Tag, Camera, Bot, Sprout, BarChart3, Sparkles, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import CameraRecognition from "./image-ocr/camerarecog";

import { getMenuSuggestions, getComprehensiveMenuAnalysis, getSeasonalMenuRecommendations, getMenuEngineeringAnalysis, getAutoMenuCreation } from "@/models/MenuAgent";
import MarkdownRenderer from "@/components/markdown-renderer"

export default function MenuPage() {
  const [activeTab, setActiveTab] = useState("items");
  interface MenuItem {
    id: number;
    name: string;
    price: number;
    category_id: number;
    description: string;
    image_url?: string;
    is_available: boolean;
  }
  interface MenuCategory {
    id: number;
    name: string;
    display_order: number;
  }
  interface InventoryItem {
    id: number;
    name: string;
    category_id: number;
    unit: string;
    quantity: number;
    price: number;
  }
  interface InventoryCategory {
    id: number;
    name: string;
  }
  interface MenuItemIngredient {
    id: number;
    menu_item_id: number;
    inventory_item_id: number;
    quantity_required: number;
  }

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryCategories, setInventoryCategories] = useState<
    InventoryCategory[]
  >([]);
  const [menuItemIngredients, setMenuItemIngredients] = useState<
    MenuItemIngredient[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CSV Upload states
  const [csvUploadOpen, setCsvUploadOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvUploading, setCsvUploading] = useState(false);

  const [filters, setFilters] = useState({
    name: "",
    categoryId: "",
    availability: "all", // 'all', 'available', 'unavailable'
  });

  // Modal states
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(
    null
  );

  // Form states
  const [itemForm, setItemForm] = useState<{
    name: string;
    price: string;
    category_id: string;
    description: string;
    image_url: string;
    is_available: boolean;
    ingredients: { inventory_item_id: string; quantity_required: string }[];
  }>({
    name: "",
    price: "",
    category_id: "",
    description: "",
    image_url: "",
    is_available: true,
    ingredients: [],
  });

  const [categoryForm, setCategoryForm] = useState<{
    name: string;
    display_order: number;
  }>({
    name: "",
    display_order: 0,
  });

  const [selectedInventoryCategory, setSelectedInventoryCategory] =
    useState<string>("");

  // Add state for multi-delete functionality
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAll, setDeleteAll] = useState(false);

  // Camera Recognition states
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        menuItemsRes,
        categoriesRes,
        inventoryItemsRes,
        inventoryCategoriesRes,
        ingredientsRes,
      ] = await Promise.all([
        supabase.from("menu_items").select("*"),
        supabase.from("menu_categories").select("*").order("display_order"),
        supabase.from("inventory_items").select("*"),
        supabase.from("inventory_categories").select("*"),
        supabase
          .from("menu_item_ingredients")
          .select(
            `*, inventory_items (id, name, unit), menu_items (id, name)`
          ),
      ]);

      if (menuItemsRes.error) throw menuItemsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (inventoryItemsRes.error) throw inventoryItemsRes.error;
      if (inventoryCategoriesRes.error) throw inventoryCategoriesRes.error;
      if (ingredientsRes.error) throw ingredientsRes.error;

      setMenuItems(menuItemsRes.data || []);
      setMenuCategories(categoriesRes.data || []);
      setInventoryItems(inventoryItemsRes.data || []);
      setInventoryCategories(inventoryCategoriesRes.data || []);
      setMenuItemIngredients(ingredientsRes.data || []);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(err ? String(err) : "An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getCategoryName = (categoryId: number) => {
    const category = menuCategories.find((cat) => cat.id === categoryId);
    return category ? category.name : "Uncategorized";
  };

  const getInventoryCategoryName = (categoryId: number) => {
    const category = inventoryCategories.find((cat) => cat.id === categoryId);
    return category ? category.name : "Uncategorized";
  };

  const getFilteredInventoryItems = () => {
    if (!selectedInventoryCategory) return inventoryItems;
    return inventoryItems.filter(
      (item) => item.category_id === parseInt(selectedInventoryCategory)
    );
  };

  const getItemIngredients = (menuItemId: number) => {
    return menuItemIngredients.filter((ing) => ing.menu_item_id === menuItemId);
  };

  // Form handlers
  const handleItemSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const itemData = {
        name: itemForm.name,
        price: parseFloat(itemForm.price),
        category_id: parseInt(itemForm.category_id) || null,
        description: itemForm.description,
        image_url: itemForm.image_url,
        is_available: itemForm.is_available,
      };

      let savedItem: MenuItem | null = null;

      if (editingItem) {
        const { data, error } = await supabase
          .from("menu_items")
          .update(itemData)
          .eq("id", editingItem.id)
          .select();
        if (error) throw error;
        savedItem = data?.[0];
        if (savedItem) {
          setMenuItems((prev) =>
            prev.map((item) => (item.id === savedItem!.id ? savedItem! : item))
          );
        }
      } else {
        const { data, error } = await supabase
          .from("menu_items")
          .insert([itemData])
          .select();
        if (error) throw error;
        savedItem = data?.[0];
        if (savedItem) {
          setMenuItems((prev) => [...prev, savedItem!]);
        }
      }

      if (savedItem) {
        // First, delete all existing ingredients for this menu item
        const { error: deleteError } = await supabase
          .from("menu_item_ingredients")
          .delete()
          .eq("menu_item_id", savedItem.id);

        if (deleteError) throw deleteError;

        // Then, insert the new ingredients
        const ingredientsToInsert = itemForm.ingredients
          .filter(
            (ing) => ing.inventory_item_id && ing.quantity_required
          )
          .map((ing) => ({
            menu_item_id: savedItem!.id,
            inventory_item_id: parseInt(ing.inventory_item_id),
            quantity_required: parseFloat(ing.quantity_required),
          }));

        if (ingredientsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from("menu_item_ingredients")
            .insert(ingredientsToInsert);
          if (insertError) throw insertError;
        }
      }

      loadData(); // Reload all data to ensure consistency
      resetItemForm();
      setShowItemModal(false);
    } catch (err) {
      console.error("Error saving item:", err);
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const categoryData = {
        name: categoryForm.name,
        display_order: Number(categoryForm.display_order),
      };

      if (editingCategory) {
        const { data, error } = await supabase
          .from("menu_categories")
          .update(categoryData)
          .eq("id", editingCategory.id)
          .select();
        if (error) throw error;
        if (data) {
          setMenuCategories((prev) =>
            prev.map((cat) => (cat.id === data[0].id ? data[0] : cat))
          );
        }
      } else {
        const { data, error } = await supabase
          .from("menu_categories")
          .insert([categoryData])
          .select();
        if (error) throw error;
        if (data) {
          setMenuCategories((prev) => [...prev, data[0]]);
        }
      }

      resetCategoryForm();
      setShowCategoryModal(false);
    } catch (err) {
      console.error("Error saving category:", err);
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        console.log("Attempting to delete menu item with ID:", id);
        const { error } = await supabase.from("menu_items").delete().eq("id", id);
        if (error) {
          console.error("Supabase error:", error);
          throw error;
        }
        
        console.log("Successfully deleted menu item from database");
        
        // Remove from local state
        setMenuItems((prev) => prev.filter((item) => item.id !== id));
        
        // Also remove related ingredients
        setMenuItemIngredients((prev) => prev.filter((ingredient) => ingredient.menu_item_id !== id));
        
        console.log("Updated local state");
        
        // Optionally reload data to ensure consistency
        await loadData();
        console.log("Reloaded data");
      } catch (err) {
        console.error("Error deleting item:", err);
        if (err instanceof Error) {
          setError(err.message);
        }
      }
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        console.log("Attempting to delete category with ID:", id);
        const { error } = await supabase
          .from("menu_categories")
          .delete()
          .eq("id", id);
        if (error) {
          console.error("Supabase error:", error);
          throw error;
        }
        
        console.log("Successfully deleted category from database");
        
        // Remove from local state
        setMenuCategories((prev) => prev.filter((cat) => cat.id !== id));
        
        console.log("Updated local state");
        
        // Optionally reload data to ensure consistency
        await loadData();
        console.log("Reloaded data");
      } catch (err) {
        console.error("Error deleting category:", err);
        if (err instanceof Error) {
          setError(err.message);
        }
      }
    }
  };

  const addIngredient = () => {
    setItemForm((prev) => ({
      ...prev,
      ingredients: [
        ...(prev.ingredients || []),
        { inventory_item_id: "", quantity_required: "" },
      ],
    }));
  };

  const removeIngredient = (index: number) => {
    setItemForm((prev) => ({
      ...prev,
      ingredients: (prev.ingredients || []).filter((_, i) => i !== index),
    }));
  };

  const updateIngredient = (index: number, field: string, value: string) => {
    setItemForm((prev) => ({
      ...prev,
      ingredients: (prev.ingredients || []).map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      ),
    }));
  };

  const resetItemForm = () => {
    setItemForm({
      name: "",
      price: "",
      category_id: "",
      description: "",
      image_url: "",
      is_available: true,
      ingredients: [],
    });
    setEditingItem(null);
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: "",
      display_order: 0,
    });
    setEditingCategory(null);
  };

  const openItemModal = (item: MenuItem | null = null) => {
    if (item) {
      setEditingItem(item);
      const ingredients = getItemIngredients(item.id);
      setItemForm({
        name: item.name,
        price: item.price.toString(),
        category_id: item.category_id ? item.category_id.toString() : "",
        description: item.description || "",
        image_url: item.image_url || "",
        is_available: item.is_available,
        ingredients: ingredients.map((ing) => ({
          inventory_item_id: ing.inventory_item_id.toString(),
          quantity_required: ing.quantity_required.toString(),
        })),
      });
    } else {
      resetItemForm();
    }
    setShowItemModal(true);
  };

  const openCategoryModal = (category: MenuCategory | null = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        display_order: category.display_order,
      });
    } else {
      resetCategoryForm();
    }
    setShowCategoryModal(true);
  };

  const filteredMenuItems = menuItems.filter(item => {
    const nameMatch = item.name.toLowerCase().includes(filters.name.toLowerCase());
    const categoryMatch = filters.categoryId ? item.category_id === parseInt(filters.categoryId) : true;
    const availabilityMatch = filters.availability === 'all' ? true : item.is_available === (filters.availability === 'available');
    return nameMatch && categoryMatch && availabilityMatch;
  });

  const resetFilters = () => {
    setFilters({
      name: "",
      categoryId: "",
      availability: "all",
    });
  };

  // CSV Upload functionality for menu items
  const handleMenuCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "text/csv") {
      setCsvFile(file)
      parseMenuCsvFile(file)
    } else {
      setError("Please select a valid CSV file")
    }
  }

  // Extend CSV Upload functionality to handle ingredients
  const parseMenuCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

      // Expected headers: name, category, price, description, is_available, ingredient_1, ingredient_1_qty, ...
      const requiredHeaders = ["name", "category", "price", "description"];
      const hasRequiredHeaders = requiredHeaders.every((h) => headers.includes(h));

      if (!hasRequiredHeaders) {
        setError(
          "CSV must have columns: name, category, price, description (is_available and ingredients are optional)"
        );
        return;
      }

      const data = lines
        .slice(1)
        .map((line, index) => {
          const values = line.split(",").map((v) => v.trim());
          const row: any = {};
          headers.forEach((header, i) => {
            row[header] = values[i] || "";
          });
          row.rowIndex = index + 2; // +2 because we start from line 2 in CSV
          return row;
        })
        .filter((row) => row.name); // Filter out empty rows

      setCsvPreview(data);
    };
    reader.readAsText(file);
  }

  const uploadMenuCsvData = async () => {
    if (!csvPreview.length) return;

    setCsvUploading(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      for (const row of csvPreview) {
        try {
          // Find or create category
          let categoryId = null;
          if (row.category) {
            let category = menuCategories.find(
              (cat) => cat.name.toLowerCase() === row.category.toLowerCase()
            );

            if (!category) {
              // Create new category with auto display order
              const maxOrder = Math.max(
                0,
                ...menuCategories.map((c) => c.display_order)
              );
              const { data: newCat, error: catError } = await supabase
                .from("menu_categories")
                .insert({
                  name: row.category,
                  display_order: maxOrder + 1,
                })
                .select()
                .single();

              if (catError) throw catError;
              category = newCat;
              // Add to local categories state
              setMenuCategories((prev) => [...prev, category!]);
            }
            if (category) {
              categoryId = category.id;
            }
          }

          // Prepare item data
          const itemData = {
            name: row.name,
            category_id: categoryId,
            price: parseFloat(row.price) || 0,
            description: row.description || "",
            image_url: row.image_url || null,
            is_available: row.is_available
              ? row.is_available.toLowerCase() === "true" ||
                row.is_available === "1"
              : true,
          };

          // Validate required fields
          if (!itemData.name || itemData.price <= 0) {
            throw new Error(
              `Invalid data in row ${row.rowIndex}: name and price are required`
            );
          }

          const { data: newItem, error: itemError } = await supabase
            .from("menu_items")
            .insert(itemData)
            .select()
            .single();

          if (itemError) throw itemError;

          // Handle ingredients
          const ingredientsToInsert = [];
          for (let i = 1; row[`ingredient_${i}`]; i++) {
            const ingredientName = row[`ingredient_${i}`];
            const ingredientQty = parseFloat(row[`ingredient_${i}_qty`]);

            if (!ingredientName || isNaN(ingredientQty) || ingredientQty <= 0) {
              errors.push(
                `Row ${row.rowIndex}: Invalid ingredient data for ingredient_${i}`
              );
              continue;
            }

            const inventoryItem = inventoryItems.find(
              (item) => item.name.toLowerCase() === ingredientName.toLowerCase()
            );

            if (!inventoryItem) {
              errors.push(
                `Row ${row.rowIndex}: Ingredient '${ingredientName}' not found in inventory`
              );
              continue;
            }

            ingredientsToInsert.push({
              menu_item_id: newItem.id,
              inventory_item_id: inventoryItem.id,
              quantity_required: ingredientQty,
            });
          }

          if (ingredientsToInsert.length > 0) {
            const { error: ingredientError } = await supabase
              .from("menu_item_ingredients")
              .insert(ingredientsToInsert);
            if (ingredientError) throw ingredientError;
          }

          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(
            `Row ${row.rowIndex}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      // Show results
      if (errorCount === 0) {
        alert(`Successfully uploaded ${successCount} menu items!`);
      } else {
        alert(
          `Upload complete: ${successCount} successful, ${errorCount} errors.\n\nFirst few errors:\n${errors
            .slice(0, 3)
            .join("\n")}`
        );
      }

      // Refresh data and close dialog
      loadData();
      setCsvUploadOpen(false);
      setCsvFile(null);
      setCsvPreview([]);
    } catch (error) {
      alert("An unexpected error occurred during upload");
      console.error("CSV Upload error:", error);
    } finally {
      setCsvUploading(false);
    }
  }

  // Function to toggle item selection
  const toggleItemSelection = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Function to handle delete action
  const handleDeleteSelected = async () => {
    try {
      // Add detailed logging to debug Supabase delete query
      console.log("Delete All:", deleteAll);
      console.log("Selected Items:", selectedItems);

      if (deleteAll) {
        console.log("Attempting to delete all items from menu_items table");
        const { error } = await supabase.from("menu_items").delete();
        if (error) {
          console.error("Supabase error while deleting all items:", error);
          throw error;
        }
        setMenuItems([]);
        setMenuItemIngredients([]);
      } else {
        console.log("Attempting to delete selected items:", selectedItems);
        const { error } = await supabase
          .from("menu_items")
          .delete()
          .in("id", selectedItems);
        if (error) {
          console.error("Supabase error while deleting selected items:", error);
          throw error;
        }
        setMenuItems((prev) => prev.filter((item) => !selectedItems.includes(item.id)));
        setMenuItemIngredients((prev) =>
          prev.filter((ingredient) => !selectedItems.includes(ingredient.menu_item_id))
        );
      }
      setSelectedItems([]);
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Error deleting items:", err);
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  // Function to open delete modal
  const openDeleteModal = (all: boolean = false) => {
    setDeleteAll(all);
    setShowDeleteModal(true);
  };

  // Function to close delete modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteAll(false);
  };

  // Camera recognition handlers
  const handleCameraSuccess = () => {
    console.log('Camera recognition completed successfully');
    loadData(); // Reload menu data after successful upload
    setShowCameraModal(false);
  };

  const handleCameraClose = () => {
    console.log('Camera modal closed');
    setShowCameraModal(false);
  };

  const handleGetAiSuggestions = async () => {
    setLoadingAi(true);
    try {
      // Get comprehensive menu analysis
      const menuAnalysisData = {
        menuItems,
        menuCategories,
        inventoryItems,
        timeRange: "current",
        seasonalContext: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
      };
      
      const insights = await getComprehensiveMenuAnalysis(menuAnalysisData);
      setAiSuggestions(insights || "No insights available.");
      setShowAiSuggestions(true);
    } catch (error) {
      console.error('Error getting menu analysis:', error);
      // Fallback to basic suggestions
      const suggestions = await getMenuSuggestions(
        "Current menu:\n" +
          menuItems.map((item) => item.name).join("\n")
      );
      setAiSuggestions(suggestions || "No suggestions available.");
      setShowAiSuggestions(true);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleGetSeasonalMenuRecommendations = async () => {
    setLoadingAi(true);
    try {
      const seasonalInsights = await getSeasonalMenuRecommendations();
      setAiSuggestions(seasonalInsights || "No seasonal recommendations available.");
      setShowAiSuggestions(true);
    } catch (error) {
      console.error('Error getting seasonal menu recommendations:', error);
      setAiSuggestions("Unable to get seasonal menu recommendations at this time.");
      setShowAiSuggestions(true);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleGetMenuEngineering = async () => {
    setLoadingAi(true);
    try {
      const menuEngineeringData = {
        menuItems,
        menuCategories,
        inventoryItems,
        timeRange: "monthly"
      };
      
      const engineeringAnalysis = await getMenuEngineeringAnalysis(menuEngineeringData);
      setAiSuggestions(engineeringAnalysis || "No menu engineering analysis available.");
      setShowAiSuggestions(true);
    } catch (error) {
      console.error('Error getting menu engineering analysis:', error);
      setAiSuggestions("Unable to generate menu engineering analysis at this time.");
      setShowAiSuggestions(true);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleAutoMenuCreation = async () => {
    setLoadingAi(true);
    try {
      const autoMenuInsights = await getAutoMenuCreation(
        inventoryItems, 
        "All Categories", 
        "₹100-500"
      );
      setAiSuggestions(autoMenuInsights || "No auto menu creation available.");
      setShowAiSuggestions(true);
    } catch (error) {
      console.error('Error getting auto menu creation:', error);
      setAiSuggestions("Unable to create automatic menu suggestions at this time.");
      setShowAiSuggestions(true);
    } finally {
      setLoadingAi(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto bg-background text-foreground">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Menu Manager</h1>
        <p className="text-muted-foreground">
          Manage your restaurant's menu items, categories, and ingredient requirements.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="-mb-px grid grid-cols-2 sm:flex sm:space-x-8">
          <button
            onClick={() => setActiveTab("items")}
            className={`py-3 px-1 text-center border-b-2 font-medium text-sm sm:text-base ${
              activeTab === "items"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <ChefHat className="inline-block w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Menu Items
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`py-3 px-1 text-center border-b-2 font-medium text-sm sm:text-base ${
              activeTab === "categories"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <Tag className="inline-block w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Categories
          </button>
        </nav>
      </div>

      {/* Menu Items Tab */}
      {activeTab === "items" && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-xl sm:text-2xl font-bold text-primary">Menu Items</h2>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
              <button
                onClick={() => setCsvUploadOpen(true)}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center space-x-2 shadow-md text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Upload CSV</span>
              </button>
              <button
                onClick={() => setShowCameraModal(true)}
                className="bg-blue-500 text-white hover:bg-blue-600 px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center space-x-2 shadow-md text-sm sm:text-base"
              >
                <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Scan Menu</span>
              </button>
              <button
                onClick={() => openItemModal()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center space-x-2 shadow-md text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Add Item</span>
              </button>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={handleGetAiSuggestions}
                  disabled={loadingAi}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-2 sm:px-3 py-2 rounded-lg flex items-center justify-center space-x-1 shadow-md text-xs sm:text-sm"
                >
                  {loadingAi ? (
                    <>
                      <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> Generating…
                    </>
                  ) : (
                    <>
                      <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Menu Analysis</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleGetSeasonalMenuRecommendations}
                  disabled={loadingAi}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-2 sm:px-3 py-2 rounded-lg flex items-center justify-center space-x-1 shadow-md text-xs sm:text-sm"
                >
                  {loadingAi ? (
                    <>
                      <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> Generating…
                    </>
                  ) : (
                    <>
                      <Sprout className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Seasonal Menu</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleGetMenuEngineering}
                  disabled={loadingAi}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-2 sm:px-3 py-2 rounded-lg flex items-center justify-center space-x-1 shadow-md text-xs sm:text-sm"
                >
                  {loadingAi ? (
                    <>
                      <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> Generating…
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Engineering</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleAutoMenuCreation}
                  disabled={loadingAi}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-2 sm:px-3 py-2 rounded-lg flex items-center justify-center space-x-1 shadow-md text-xs sm:text-sm"
                >
                  {loadingAi ? (
                    <>
                      <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="inline">Auto Create</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4">
            <button
              onClick={() => openDeleteModal(true)}
              className="bg-red-500 text-white hover:bg-red-600 px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center space-x-2 shadow-md text-sm sm:text-base"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Delete All</span>
            </button>
            <button
              onClick={() => openDeleteModal(false)}
              disabled={selectedItems.length === 0}
              className={`${
                selectedItems.length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-red-500 text-white hover:bg-red-600"
              } px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center space-x-2 shadow-md text-sm sm:text-base`}
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Delete Selected ({selectedItems.length})</span>
              <span className="sm:hidden">Delete ({selectedItems.length})</span>
            </button>
          </div>

          {/* Menu Items Table - Desktop */}
          <div className="hidden md:block border rounded-lg overflow-hidden shadow-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(filteredMenuItems.map((item) => item.id));
                        } else {
                          setSelectedItems([]);
                        }
                      }}
                      checked={
                        filteredMenuItems.length > 0 &&
                        selectedItems.length === filteredMenuItems.length
                      }
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Availability
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMenuItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-100">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                        className="form-checkbox h-5 w-5 text-primary focus:ring-primary focus:ring-2"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getCategoryName(item.category_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{item.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          item.is_available
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.is_available ? "Available" : "Unavailable"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openItemModal(item)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Menu Items Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredMenuItems.map((item) => (
              <div key={item.id} className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                      className="form-checkbox h-4 w-4 text-primary focus:ring-primary focus:ring-2"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                      <p className="text-xs text-gray-500">{getCategoryName(item.category_id)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openItemModal(item)}
                      className="text-indigo-600 hover:text-indigo-900 p-1"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-600 hover:text-red-900 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">₹{item.price.toFixed(2)}</span>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      item.is_available
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {item.is_available ? "Available" : "Unavailable"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Tab - simplified for now */}
      {activeTab === "categories" && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-xl sm:text-2xl font-semibold">Categories</h2>
            <button
              onClick={() => openCategoryModal()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 sm:px-4 py-2 rounded-lg flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="grid gap-4">
            {/* Categories Table (Desktop) */}
            <div className="hidden md:block border rounded-lg overflow-hidden mt-8">
              <table className="min-w-full divide-y">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Sr. No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Category Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Display Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y">
                  {menuCategories.map((category, index) => (
                    <tr key={category.id} className="hover:bg-muted">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {category.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {category.display_order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openCategoryModal(category)}
                          className="text-muted-foreground hover:text-foreground mr-3"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Categories Mobile Cards */}
            <div className="md:hidden space-y-4 mt-4">
              {menuCategories.map((category, index) => (
                <div key={category.id} className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                        #{index + 1}
                      </span>
                      <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openCategoryModal(category)}
                        className="text-gray-600 hover:text-gray-900 p-1"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Display Order: {category.display_order}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {csvUploadOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background text-foreground p-6 rounded-lg shadow-lg w-full max-w-4xl border max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Upload Menu Items from CSV</h2>
              <button
                onClick={() => {
                  setCsvUploadOpen(false);
                  setCsvFile(null);
                  setCsvPreview([]);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid gap-4">
              {/* CSV Format Instructions */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Required CSV Format:</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Your CSV file must have the following columns (header row required):
                </p>
                <div className="bg-background p-2 rounded text-sm font-mono">
                  name,category,price,description,is_available,ingredient_1,ingredient_1_qty,ingredient_2,ingredient_2_qty,...
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  <p><strong>Required:</strong> name, category, price, description</p>
                  <p><strong>Optional:</strong> is_available (true/false, defaults to true)</p>
                  <p><strong>Ingredients:</strong> Use columns like ingredient_1, ingredient_1_qty, ingredient_2, ingredient_2_qty, etc., to specify ingredients and their quantities for each menu item.</p>
                </div>
                <div className="mt-2 bg-background p-2 rounded text-xs font-mono">
                  <div>Example:</div>
                  <div>Margherita Pizza,Pizza,12.99,Classic pizza with tomatoes and mozzarella,true,Tomato,2,Mozzarella,1</div>
                  <div>Caesar Salad,Salads,8.50,Fresh romaine lettuce with caesar dressing,true,Lettuce,3,Caesar Dressing,1</div>
                  <div>Chocolate Cake,Desserts,6.99,Rich chocolate cake with frosting,false,Flour,2,Chocolate,1</div>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label htmlFor="menu-csv-file" className="text-sm font-medium">
                  Select CSV File
                </label>
                <input
                  id="menu-csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleMenuCsvFileChange}
                  className="mt-1 w-full px-3 py-2 bg-transparent border rounded-md text-sm"
                />
              </div>

              {/* Preview */}
              {csvPreview.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Preview ({csvPreview.length} items)</h4>
                  <div className="border rounded-lg overflow-auto max-h-40">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">Name</th>
                          <th className="p-2 text-left">Category</th>
                          <th className="p-2 text-left">Price</th>
                          <th className="p-2 text-left">Description</th>
                          <th className="p-2 text-left">Available</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">{row.name}</td>
                            <td className="p-2">{row.category}</td>
                            <td className="p-2">₹{row.price}</td>
                            <td className="p-2 max-w-xs truncate">{row.description}</td>
                            <td className="p-2">{row.is_available || 'true'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvPreview.length > 5 && (
                      <div className="p-2 text-center text-sm text-muted-foreground bg-muted">
                        ... and {csvPreview.length - 5} more items
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <button
                onClick={() => {
                  setCsvUploadOpen(false);
                  setCsvFile(null);
                  setCsvPreview([]);
                }}
                disabled={csvUploading}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={uploadMenuCsvData}
                disabled={!csvPreview.length || csvUploading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
              >
                {csvUploading ? "Uploading..." : `Upload ${csvPreview.length} Items`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background text-foreground p-6 rounded-lg shadow-lg w-full max-w-2xl border max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingItem ? "Edit" : "Add"} Menu Item
              </h2>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleItemSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-transparent border rounded-md text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border rounded-md text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={itemForm.category_id}
                    onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-transparent border rounded-md text-sm"
                    required
                  >
                    <option value="">Select a category</option>
                    {menuCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-transparent border rounded-md text-sm"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  value={itemForm.image_url}
                  onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                  className="w-full px-3 py-2 bg-transparent border rounded-md text-sm"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={itemForm.is_available}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      is_available: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border"
                />
                <label className="ml-2 block text-sm">Is Available</label>
              </div>

              {/* Ingredient Management */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold">Ingredients</h3>
                <div className="text-sm text-muted-foreground mb-2">
                  Link inventory items to this menu item and specify required quantities.
                </div>
                {itemForm.ingredients.map((ing, index) => (
                  <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                      value={ing.inventory_item_id}
                      onChange={(e) =>
                        updateIngredient(
                          index,
                          "inventory_item_id",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 bg-transparent border rounded-md text-sm"
                    >
                      <option value="">Select Ingredient</option>
                      {inventoryItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Quantity"
                      value={ing.quantity_required}
                      onChange={(e) =>
                        updateIngredient(
                          index,
                          "quantity_required",
                          e.target.value
                        )
                      }
                      className="w-full sm:w-1/3 px-3 py-2 bg-transparent border rounded-md text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="text-muted-foreground hover:text-foreground p-2 bg-secondary rounded-md sm:bg-transparent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addIngredient}
                  className="text-sm flex items-center space-x-2 border px-3 py-1.5 rounded-md hover:bg-secondary"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Ingredient</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background text-foreground p-6 rounded-lg shadow-lg w-full max-w-md border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingCategory ? "Edit" : "Add"} Category
              </h2>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category Name</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-transparent border rounded-md text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Display Order</label>
                <input
                  type="number"
                  value={categoryForm.display_order}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      display_order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-transparent border rounded-md text-sm"
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background text-foreground p-6 rounded-lg shadow-lg w-full max-w-md border">
            <h2 className="text-xl font-bold mb-4">
              {deleteAll ? "Delete All Items" : "Delete Selected Items"}
            </h2>
            <p className="mb-4">
              Are you sure you want to delete {deleteAll ? "all items" : "the selected items"}?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={closeDeleteModal}
                className="bg-gray-300 text-gray-700 hover:bg-gray-400 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                className="bg-red-500 text-white hover:bg-red-600 px-4 py-2 rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Recognition Modal */}
      <CameraRecognition
        isOpen={showCameraModal}
        onClose={handleCameraClose}
        onSuccess={handleCameraSuccess}
      />
      {showAiSuggestions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-background text-foreground p-6 rounded-lg shadow-lg w-full max-w-2xl border max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">AI Menu Suggestions</h2>
              <button
                onClick={() => setShowAiSuggestions(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {aiSuggestions ? <MarkdownRenderer content={aiSuggestions} /> : (
              <div className="text-center py-8 text-muted-foreground">No suggestions available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}