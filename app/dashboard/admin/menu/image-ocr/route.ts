import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { supabase } from '@/lib/supabase';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL;

// Types for database operations
interface MenuCategory {
  id: number;
  name: string;
  display_order: number;
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category_id: number;
  description: string;
  is_available: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    console.log('Starting OCR processing...');
    console.log('Image file size:', imageFile.size, 'bytes');
    console.log('Image file type:', imageFile.type);

    // Step 1: Convert image to base64 and send to OCR service
    const imageBuffer = await imageFile.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');

    console.log('Sending image to OCR service...');
    console.log('OCR Service URL:', OCR_SERVICE_URL);
    console.log('Image base64 length:', imageBase64.length);

    const ocrResponse = await fetch(`${OCR_SERVICE_URL}/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageBase64
      }),
    });

    console.log('OCR Response status:', ocrResponse.status);
    console.log('OCR Response headers:', Object.fromEntries(ocrResponse.headers.entries()));

    if (!ocrResponse.ok) {
      let errorData;
      try {
        errorData = await ocrResponse.json();
      } catch (e) {
        // If response is not JSON, get text content
        const errorText = await ocrResponse.text();
        console.error('OCR service non-JSON error:', errorText);
        return NextResponse.json(
          { error: 'OCR processing failed', details: `HTTP ${ocrResponse.status}: ${errorText}` },
          { status: ocrResponse.status }
        );
      }
      console.error('OCR service error:', errorData);
      return NextResponse.json(
        { error: 'OCR processing failed', details: errorData.error || 'Unknown OCR error' },
        { status: ocrResponse.status }
      );
    }

    const ocrResult = await ocrResponse.json();
    
    if (!ocrResult.success || !ocrResult.text) {
      console.log('No text extracted from OCR service');
      return NextResponse.json({ error: 'No text found in image' }, { status: 400 });
    }

    const extractedText = ocrResult.text;
    console.log('OCR Text extracted successfully. Length:', extractedText.length);
    console.log('OCR Text preview:', extractedText.substring(0, 200) + '...');

    // Step 2: Get existing menu data from database
    const { existingCategories, existingMenuItems } = await getDatabaseContext();

    // Step 3: Process the extracted text with Groq LLM and database context
    return await processExtractedText(extractedText, existingCategories, existingMenuItems);

  } catch (error) {
    console.error('Error processing image:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to process image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Function to get existing database context
async function getDatabaseContext() {
  try {
    console.log('Fetching existing menu data from database...');
    
    // Fetch existing categories
    const { data: categories, error: categoriesError } = await supabase
      .from('menu_categories')
      .select('*')
      .order('display_order');
    
    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      throw categoriesError;
    }

    // Fetch existing menu items
    const { data: menuItems, error: menuItemsError } = await supabase
      .from('menu_items')
      .select('*');
    
    if (menuItemsError) {
      console.error('Error fetching menu items:', menuItemsError);
      throw menuItemsError;
    }

    console.log(`Found ${categories?.length || 0} existing categories and ${menuItems?.length || 0} existing menu items`);
    
    return {
      existingCategories: categories as MenuCategory[] || [],
      existingMenuItems: menuItems as MenuItem[] || []
    };
  } catch (error) {
    console.error('Error getting database context:', error);
    // Return empty arrays if database fetch fails
    return {
      existingCategories: [] as MenuCategory[],
      existingMenuItems: [] as MenuItem[]
    };
  }
}

// Function to create missing categories and return updated category mapping
async function ensureCategoriesExist(categoryNames: string[], existingCategories: MenuCategory[]) {
  try {
    console.log('Ensuring categories exist:', categoryNames);
    
    const categoryMapping: { [name: string]: number } = {};
    let updatedCategories = [...existingCategories];
    
    // Map existing categories
    existingCategories.forEach(cat => {
      categoryMapping[cat.name.toLowerCase()] = cat.id;
    });
    
    // Create missing categories
    const missingCategories: string[] = [];
    categoryNames.forEach(name => {
      if (!categoryMapping[name.toLowerCase()]) {
        missingCategories.push(name);
      }
    });
    
    if (missingCategories.length > 0) {
      console.log('Creating missing categories:', missingCategories);
      
      const categoriesToInsert = missingCategories.map((name, index) => ({
        name: name,
        display_order: (existingCategories.length + index + 1)
      }));
      
      const { data: newCategories, error } = await supabase
        .from('menu_categories')
        .insert(categoriesToInsert)
        .select();
      
      if (error) {
        console.error('Error creating categories:', error);
        throw error;
      }
      
      // Update mapping with new categories
      if (newCategories) {
        newCategories.forEach(cat => {
          categoryMapping[cat.name.toLowerCase()] = cat.id;
          updatedCategories.push(cat);
        });
        console.log(`Created ${newCategories.length} new categories`);
      }
    }
    
    return { categoryMapping, updatedCategories };
  } catch (error) {
    console.error('Error ensuring categories exist:', error);
    throw error;
  }
}

// Function to handle text processing with Groq
async function processExtractedText(text: string, existingCategories: MenuCategory[], existingMenuItems: MenuItem[]) {
  try {
    // Prepare database context for LLM
    const existingCategoryNames = existingCategories.map(cat => cat.name).join(', ');
    const existingItemNames = existingMenuItems.map(item => item.name).slice(0, 20).join(', '); // Limit to avoid token overflow
    
    console.log('Database context - Categories:', existingCategoryNames);
    console.log('Database context - Sample items:', existingItemNames);

    // Step 1: Clean the OCR text using Groq LLM
    console.log('Cleaning OCR text with Groq...');
    const cleaningResponse = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content: `You are an expert at cleaning and formatting OCR text from restaurant menus. 
          Your task is to:
          1. Fix OCR errors and typos
          2. Properly format menu items
          3. Remove irrelevant text like addresses, phone numbers, etc.
          4. Keep only menu items with their prices
          5. Standardize the format
          6. Remove duplicate entries
          
          Context: This restaurant already has these categories: ${existingCategoryNames || 'None'}
          And these sample menu items: ${existingItemNames || 'None'}
          
          Return only the cleaned menu text, nothing else.`
        },
        {
          role: "user",
          content: `Clean this OCR text from a restaurant menu:\n\n${text}`
        }
      ],
      temperature: 0.1,
    });

    const cleanedText = cleaningResponse.choices[0]?.message?.content || '';
    console.log('Text cleaning completed. Cleaned text length:', cleanedText.length);
    console.log('Cleaned text preview:', cleanedText.substring(0, 200) + '...');

    // Step 2: Extract structured menu data using Groq with JSON schema
    console.log('Extracting structured menu data with Groq...');
    const structureResponse = await groq.chat.completions.create({
      model: "llama3-groq-70b-8192-tool-use-preview",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting structured menu data from restaurant menu text. 
          Extract menu items with their details from the provided text.
          Be thorough and accurate. If price is not clear, set it to 0.
          Create appropriate categories based on the menu structure.
          Ensure all prices are in Indian Rupees (₹).
          
          Context: This restaurant already has these categories: ${existingCategoryNames || 'None'}
          Try to use existing categories when appropriate, but create new ones if needed.
          Existing menu items include: ${existingItemNames || 'None'}
          Avoid duplicating existing items unless they have different prices or descriptions.`
        },
        {
          role: "user",
          content: `Extract menu items from this cleaned menu text:\n\n${cleanedText}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "menu_extraction",
          schema: {
            type: "object",
            properties: {
              categories: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    display_order: { type: "number" }
                  },
                  required: ["name", "display_order"],
                  additionalProperties: false
                }
              },
              menu_items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    price: { type: "number" },
                    category: { type: "string" },
                    description: { type: "string" },
                    is_available: { type: "boolean" }
                  },
                  required: ["name", "price", "category", "description", "is_available"],
                  additionalProperties: false
                }
              },
              extraction_confidence: {
                type: "string",
                enum: ["high", "medium", "low"]
              },
              notes: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["categories", "menu_items", "extraction_confidence", "notes"],
            additionalProperties: false
          }
        }
      },
      temperature: 0.1,
    });

    const structuredData = JSON.parse(structureResponse.choices[0]?.message?.content || '{}');
    console.log('Structured data extraction completed');
    console.log('Categories found:', structuredData.categories?.length || 0);
    console.log('Menu items found:', structuredData.menu_items?.length || 0);
    console.log('Extraction confidence:', structuredData.extraction_confidence);

    // Step 3: Ensure all categories exist in database and get category mapping
    const categoryNames = structuredData.categories?.map((cat: any) => cat.name) || [];
    const { categoryMapping, updatedCategories } = await ensureCategoriesExist(categoryNames, existingCategories);

    // Step 4: Map menu items to category IDs and prepare final data
    const processedMenuItems = structuredData.menu_items?.map((item: any) => ({
      ...item,
      category_id: categoryMapping[item.category.toLowerCase()] || null
    })) || [];

    console.log('Processing completed. Ready to return structured data with category IDs.');

    return NextResponse.json({
      success: true,
      originalText: text,
      cleanedText: cleanedText,
      structuredData: {
        ...structuredData,
        menu_items: processedMenuItems
      },
      categoryMapping: categoryMapping,
      updatedCategories: updatedCategories,
      stats: {
        categoriesCreated: Object.keys(categoryMapping).length - existingCategories.length,
        itemsExtracted: processedMenuItems.length,
        confidence: structuredData.extraction_confidence
      }
    });

  } catch (error) {
    console.error('Error in text processing:', error);
    throw error;
  }
}
