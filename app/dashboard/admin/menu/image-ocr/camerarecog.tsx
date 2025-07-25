"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Upload, X, Check, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface MenuCategory {
  name: string;
  display_order: number;
}

interface MenuItem {
  name: string;
  price: number;
  category: string;
  description: string;
  is_available: boolean;
}

interface StructuredData {
  categories: MenuCategory[];
  menu_items: MenuItem[];
  extraction_confidence: 'high' | 'medium' | 'low';
  notes: string[];
}

interface OCRResult {
  originalText: string;
  cleanedText: string;
  structuredData: StructuredData;
}

interface CameraRecognitionProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CameraRecognition({ isOpen, onClose, onSuccess }: CameraRecognitionProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showOriginalText, setShowOriginalText] = useState(false);
  const [showCleanedText, setShowCleanedText] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageDataUrl);
        stopCamera();
      }
    }
  }, [stopCamera]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const processImage = useCallback(async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('image', blob, 'menu-image.jpg');

      const result = await fetch('/dashboard/admin/menu/image-ocr', {
        method: 'POST',
        body: formData,
      });

      if (!result.ok) {
        throw new Error('Failed to process image');
      }

      const data = await result.json();
      setOcrResult(data);
      setShowPreview(true);
      
      toast({
        title: "Image Processed",
        description: `Extracted ${data.structuredData.menu_items.length} menu items with ${data.structuredData.extraction_confidence} confidence.`,
      });
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, toast]);

  const uploadToSupabase = useCallback(async () => {
    if (!ocrResult?.structuredData) return;

    setIsUploading(true);
    try {
      const { categories, menu_items } = ocrResult.structuredData;

      // First, upload categories
      const categoryMap = new Map<string, number>();
      
      for (const category of categories) {
        const { data: existingCategory } = await supabase
          .from('menu_categories')
          .select('id')
          .eq('name', category.name)
          .single();

        if (existingCategory) {
          categoryMap.set(category.name, existingCategory.id);
        } else {
          const { data: newCategory, error } = await supabase
            .from('menu_categories')
            .insert({
              name: category.name,
              display_order: category.display_order
            })
            .select('id')
            .single();

          if (error) throw error;
          if (newCategory) {
            categoryMap.set(category.name, newCategory.id);
          }
        }
      }

      // Then upload menu items
      const menuItemsToInsert = menu_items.map(item => ({
        name: item.name,
        price: item.price,
        category_id: categoryMap.get(item.category) || null,
        description: item.description,
        is_available: item.is_available,
      }));

      const { error: menuError } = await supabase
        .from('menu_items')
        .insert(menuItemsToInsert);

      if (menuError) throw menuError;

      toast({
        title: "Upload Successful",
        description: `Successfully uploaded ${menu_items.length} menu items to the database.`,
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error uploading to Supabase:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload menu items to database.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [ocrResult, toast, onSuccess]);

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setOcrResult(null);
    setShowPreview(false);
    setShowOriginalText(false);
    setShowCleanedText(false);
    onClose();
  }, [stopCamera, onClose]);

  const resetProcess = useCallback(() => {
    setCapturedImage(null);
    setOcrResult(null);
    setShowPreview(false);
    setShowOriginalText(false);
    setShowCleanedText(false);
  }, []);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Menu Recognition</DialogTitle>
          <DialogDescription>
            Capture or upload a photo of your menu to automatically extract menu items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!capturedImage && !showPreview && (
            <div className="space-y-4">
              {/* Camera Controls */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={startCamera} 
                  disabled={isCameraActive}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {isCameraActive ? 'Camera Active' : 'Start Camera'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Camera Preview */}
              {isCameraActive && (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full max-h-96 rounded-lg"
                  />
                  <Button
                    onClick={capturePhoto}
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
                    size="lg"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Capture Photo
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Captured Image Preview */}
          {capturedImage && !showPreview && (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captured menu"
                  className="w-full max-h-96 object-contain rounded-lg border"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={processImage} 
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Process Image
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={resetProcess}>
                  <X className="w-4 h-4 mr-2" />
                  Retake
                </Button>
              </div>
            </div>
          )}

          {/* Results Preview */}
          {showPreview && ocrResult && (
            <div className="space-y-6">
              {/* Confidence and Stats */}
              <div className="flex flex-wrap gap-2 items-center">
                <Badge className={getConfidenceColor(ocrResult.structuredData.extraction_confidence)}>
                  {ocrResult.structuredData.extraction_confidence.toUpperCase()} Confidence
                </Badge>
                <Badge variant="outline">
                  {ocrResult.structuredData.categories.length} Categories
                </Badge>
                <Badge variant="outline">
                  {ocrResult.structuredData.menu_items.length} Items
                </Badge>
              </div>

              {/* OCR Text Toggles */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOriginalText(!showOriginalText)}
                >
                  {showOriginalText ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                  Original OCR Text
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCleanedText(!showCleanedText)}
                >
                  {showCleanedText ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                  Cleaned Text
                </Button>
              </div>

              {/* OCR Text Display */}
              {showOriginalText && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Original OCR Text</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-3 rounded max-h-32 overflow-y-auto">
                      {ocrResult.originalText}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {showCleanedText && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Cleaned Text</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-3 rounded max-h-32 overflow-y-auto">
                      {ocrResult.cleanedText}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Extracted Menu Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Extracted Menu Items</CardTitle>
                  <CardDescription>
                    Review the extracted menu items before uploading to your database
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-64 overflow-y-auto">
                    {ocrResult.structuredData.categories.map((category, idx) => {
                      const categoryItems = ocrResult.structuredData.menu_items.filter(
                        item => item.category === category.name
                      );
                      
                      return (
                        <div key={idx} className="space-y-2">
                          <h4 className="font-semibold text-lg border-b pb-1">
                            {category.name}
                          </h4>
                          <div className="grid gap-2">
                            {categoryItems.map((item, itemIdx) => (
                              <div 
                                key={itemIdx} 
                                className="flex justify-between items-start p-2 border rounded-lg bg-muted/50"
                              >
                                <div className="flex-1">
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {item.description}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold">₹{item.price.toFixed(2)}</div>
                                  <Badge 
                                    variant={item.is_available ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {item.is_available ? "Available" : "Unavailable"}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {ocrResult.structuredData.notes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Processing Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1">
                      {ocrResult.structuredData.notes.map((note, idx) => (
                        <li key={idx} className="text-muted-foreground">• {note}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {showPreview && ocrResult && (
            <>
              <Button variant="outline" onClick={resetProcess}>
                <X className="w-4 h-4 mr-2" />
                Start Over
              </Button>
              <Button 
                onClick={uploadToSupabase} 
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Upload to Database
                  </>
                )}
              </Button>
            </>
          )}
          {!showPreview && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
        </DialogFooter>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
