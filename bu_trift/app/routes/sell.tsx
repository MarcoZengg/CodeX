import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";
import type { Route } from "./+types/sell";
import { Item } from "@/entities";
import type { Item as ItemType } from "@/entities/Item";
import type { User as UserType } from "@/entities/User";
import { useNavigate } from "react-router";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, X, Camera, Plus, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import type { ItemCategory, ItemCondition } from "@/entities/Item";
import { API_URL } from "../config"; // <-- make sure path matches your project

const categories: { value: ItemCategory | ""; label: string }[] = [
  { value: "textbooks", label: "Textbooks" },
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "furniture", label: "Furniture" },
  { value: "school_supplies", label: "School Supplies" },
  { value: "sports_equipment", label: "Sports Equipment" },
  { value: "home_decor", label: "Home Decor" },
  { value: "kitchen_items", label: "Kitchen Items" },
  { value: "bikes_transport", label: "Bikes & Transport" },
  { value: "other", label: "Other" }
];

const conditions: { value: ItemCondition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" }
];

interface FormData {
  title: string;
  description: string;
  price: string;
  category: ItemCategory | "";
  condition: ItemCondition | "";
  location: string;
  is_negotiable: boolean;
  images: string[];
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sell Item - BUTrift" },
    { name: "description", content: "List a new item for sale on BUTrift" },
  ];
}

export default function Sell() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Load current user from localStorage 
  // Purpose: remember "you're logged in" in this browser
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as UserType;
        setCurrentUser(user);
      } catch (error) {
        console.error("Error parsing stored user:", error);
      }
    } else {
      // If not logged in, redirect to login page
      navigate(createPageUrl("Login"));
    }
  }, [navigate]);
  
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    price: "",
    category: "",
    condition: "",
    location: "",
    is_negotiable: false,
    images: []
  });

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // REAL FILE UPLOAD: sends files to FastAPI /api/upload-image
  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;

    setUploadingImages(true);
    const uploadedURLs: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const data = new FormData();
        data.append("file", file);

        const res = await fetch(`${API_URL}/api/upload-image`, {
          method: "POST",
          body: data,
        });

        if (!res.ok) throw new Error("Image upload failed");

        const json = await res.json(); // { url: "http://localhost:8000/uploads/..." }
        uploadedURLs.push(json.url);
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedURLs],
      }));
      
      // Clear image error when images are successfully uploaded
      setImageError(null);
    } catch (error) {
      console.error("Error uploading images:", error);
      alert("Failed to upload image(s). Please try again.");
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setFormData(prev => {
      const newImages = prev.images.filter((_, index) => index !== indexToRemove);
      // If removing the last image, show error
      if (newImages.length === 0) {
        setImageError("Please upload at least one photo for your listing.");
      } else {
        // Clear error if images remain
        setImageError(null);
      }
      return {
        ...prev,
        images: newImages
      };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Check if user is logged in
      if (!currentUser || !currentUser.id) {
        alert("Please log in to create a listing");
        navigate(createPageUrl("Login"));
        setIsSubmitting(false);
        return;
      }

      // Validate required fields
      if (!formData.category || !formData.condition) {
        alert("Please select both category and condition");
        setIsSubmitting(false);
        return;
      }

      if (!formData.title.trim() || !formData.description.trim() || !formData.price.trim()) {
        alert("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      // Validate that at least one image is uploaded
      if (!formData.images || formData.images.length === 0) {
        setImageError("Please upload at least one photo for your listing.");
        setIsSubmitting(false);
        // Scroll to image upload section
        const imageSection = document.getElementById("image-upload-section");
        if (imageSection) {
          imageSection.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      // Clear image error if images are present
      setImageError(null);

      // Prepare data for backend - use the actual logged-in user's ID
      const itemData: ItemType = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category as ItemType["category"],
        condition: formData.condition as ItemType["condition"],
        seller_id: currentUser.id,
        location: formData.location || undefined,
        is_negotiable: formData.is_negotiable,
        images: formData.images || [], // Ensure images is always an array
      };

      console.log("Creating item with images:", itemData.images); // Debug log
      await Item.create(itemData);

      navigate(createPageUrl("Home"));
    } catch (error) {
      console.error("Error creating item:", error);
      alert(error instanceof Error ? error.message : "Failed to create listing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking user
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Sell Your Item</h1>
          <p className="text-neutral-600">List your item for fellow BU students to discover</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="border-neutral-200/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-red-600" />
                  Item Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="title">Item Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Calculus Textbook, iPhone 12, Study Desk..."
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your item's condition, any flaws, why you're selling it..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    required
                    className="mt-2 h-32"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleInputChange('category', value as ItemCategory)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition">Condition</Label>
                    <Select
                      value={formData.condition}
                      onValueChange={(value) => handleInputChange('condition', value as ItemCondition)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {conditions.map((condition) => (
                          <SelectItem key={condition.value} value={condition.value}>
                            {condition.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pricing & Location */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="border-neutral-200/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Pricing & Pickup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      required
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="location">Pickup Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Warren Towers Lobby, GSU..."
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Switch
                    checked={formData.is_negotiable}
                    onCheckedChange={(checked) => handleInputChange('is_negotiable', checked)}
                  />
                  <Label>Price is negotiable</Label>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Image Upload */}
          <motion.div
            id="image-upload-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="border-neutral-200/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-blue-600" />
                  Photos <span className="text-red-600">*</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {imageError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <p className="text-red-700 text-sm font-medium">{imageError}</p>
                  </motion.div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />

                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`Upload ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center cursor-pointer hover:border-red-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">Add Photos</h3>
                  <p className="text-neutral-600">
                    {uploadingImages ? "Uploading..." : "Click to select images or drag and drop"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex gap-4"
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("Home"))}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || uploadingImages}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? "Publishing..." : "Publish Listing"}
            </Button>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
