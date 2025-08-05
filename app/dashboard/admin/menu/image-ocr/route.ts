import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY!,
});

const OCR_SERVICE_URL = process.env.NEXT_PUBLIC_OCR_SERVICE_URL || 'http://localhost:8000';

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

    // Step 1: Send image to Python OCR service
    const ocrFormData = new FormData();
    ocrFormData.append('file', imageFile);

    console.log('Sending image to OCR service...');
    const ocrResponse = await fetch(`${OCR_SERVICE_URL}/ocr`, {
      method: 'POST',
      body: ocrFormData,
    });

    if (!ocrResponse.ok) {
      const errorData = await ocrResponse.json();
      console.error('OCR service error:', errorData);
      return NextResponse.json(
        { error: 'OCR processing failed', details: errorData.error },
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

    // Step 2: Process the extracted text with Groq LLM
    return await processExtractedText(extractedText);

  } catch (error) {
    console.error('Error processing image:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to process image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Function to handle text processing with Groq
async function processExtractedText(text: string) {
  try {
    // Step 2: Clean the OCR text using Groq LLM
    console.log('Cleaning OCR text with Groq...');
    const cleaningResponse = await groq.chat.completions.create({
      model: "moonshotai/kimi-k2-instruct",
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

    // Step 3: Extract structured menu data using Groq with JSON schema
    console.log('Extracting structured menu data with Groq...');
    const structureResponse = await groq.chat.completions.create({
      model: "moonshotai/kimi-k2-instruct",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting structured menu data from restaurant menu text. 
          Extract menu items with their details from the provided text.
          Be thorough and accurate. If price is not clear, set it to 0.
          Create appropriate categories based on the menu structure.
          Ensure all prices are in Indian Rupees (₹).`
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

    return NextResponse.json({
      success: true,
      originalText: text,
      cleanedText: cleanedText,
      structuredData: structuredData
    });

  } catch (error) {
    console.error('Error in text processing:', error);
    throw error;
  }
}
