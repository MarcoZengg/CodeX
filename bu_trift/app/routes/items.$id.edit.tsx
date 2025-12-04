import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Route } from "./+types/items.$id.edit";
import { useNavigate } from "react-router";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, X, Camera, Pencil, DollarSign, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Item } from "@/entities";
import type { Item as ItemType, ItemCategory, ItemCondition } from "@/entities/Item";
import { API_URL } from "../config";
import { getFirebaseToken } from "../utils/auth";

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
    { title: "Edit Listing - BUThrift" },
    { name: "description", content: "Update your item listing" },
  ];
}

export default function EditItem({ params }: Route.ComponentProps) {
  const navigate = useNavigate();
  const { id: itemId } = params;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoadingItem, setIsLoadingItem] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    price: "",
    category: "",
    condition: "",
    location: "",
    is_negotiable: false,
    images: [],
  });

  useEffect(() => {
    const loadItem = async () => {
      setLoadError(null);
      try {
        const token = await getFirebaseToken(false);
        if (!token) {
          navigate(createPageUrl("Login"));
          return;
        }

        const existingItem = await Item.get(itemId);
        const storedUser = localStorage.getItem("currentUser");
        const parsedUser = storedUser ? JSON.parse(storedUser) : null;

        if (!existingItem || !existingItem.id) {
          setLoadError("Item not found.");
          return;
        }

        if (!parsedUser?.id) {
          navigate(createPageUrl("Login"));
          return;
        }

        if (existingItem.seller_id !== parsedUser.id) {
          setLoadError("You can only edit your own listings.");
          return;
        }

        setFormData({
          title: existingItem.title || "",
          description: existingItem.description || "",
          price: existingItem.price?.toString() || "",
          category: (existingItem.category as ItemCategory) || "",
          condition: (existingItem.condition as ItemCondition) || "",
          location: existingItem.location || "",
          is_negotiable: existingItem.is_negotiable ?? false,
          images: existingItem.images || [],
        });

        if ((existingItem.images || []).length > 0) {
          setImageError(null);
        }
      } catch (error) {
        console.error("Error loading item:", error);
        setLoadError(error instanceof Error ? error.message : "Failed to load item.");
      } finally {
        setIsLoadingItem(false);
      }
    };

    loadItem();
  }, [itemId, navigate]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;

    setUploadingImages(true);
    const uploadedURLs: string[] = [];

    try {
      let token = await getFirebaseToken(false);
      if (!token) {
        navigate(createPageUrl("Login"));
        return;
      }

      for (const file of Array.from(files)) {
        const data = new FormData();
        data.append("file", file);

        let res = await fetch(`${API_URL}/api/upload-image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: data,
        });

        if (res.status === 401) {
          token = await getFirebaseToken(true);
          if (!token) {
            throw new Error("Authentication failed. Please login again.");
          }
          res = await fetch(`${API_URL}/api/upload-image`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: data,
          });
        }

        if (!res.ok) throw new Error("Image upload failed");

        const json = await res.json();
        uploadedURLs.push(json.url);
      }

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedURLs],
      }));
      setImageError(null);
    } catch (error) {
      console.error("Error uploading images:", error);
      alert("Failed to upload image(s). Please try again.");
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setFormData((prev) => {
      const newImages = prev.images.filter((_, index) => index !== indexToRemove);
      if (newImages.length === 0) {
        setImageError("Please upload at least one photo for your listing.");
      } else {
        setImageError(null);
      }
      return {
        ...prev,
        images: newImages,
      };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = await getFirebaseToken(false);
      if (!token) {
        navigate(createPageUrl("Login"));
        return;
      }

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

      if (!formData.images || formData.images.length === 0) {
        setImageError("Please upload at least one photo for your listing.");
        setIsSubmitting(false);
        const imageSection = document.getElementById("image-upload-section");
        if (imageSection) {
          imageSection.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      setImageError(null);

      const payload: Partial<ItemType> = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        condition: formData.condition,
        location: formData.location || undefined,
        is_negotiable: formData.is_negotiable,
        images: formData.images || [],
      };

      await Item.update(itemId, payload);
      navigate(`/items/${itemId}`);
    } catch (error) {
      console.error("Error updating item:", error);
      alert(error instanceof Error ? error.message : "Failed to update listing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingItem) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-600">Loading your listing...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 p-6 flex items-center justify-center">
        <div className="max-w-lg text-center space-y-4">
          <h2 className="text-2xl font-bold text-neutral-900">Unable to edit listing</h2>
          <p className="text-neutral-600">{loadError}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={() => navigate(createPageUrl("Profile"))} className="bg-red-600 hover:bg-red-700">
              View Profile
            </Button>
          </div>
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
          className="mb-8 flex items-center justify-between gap-4 flex-wrap"
        >
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Edit Listing</h1>
            <p className="text-neutral-600">Keep your listing up to date for buyers.</p>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="border-neutral-200/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-red-600" />
                  Listing Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="title">Item Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Calculus Textbook, iPhone 12, Study Desk..."
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
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
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    required
                    className="mt-2 h-32"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleInputChange("category", value as ItemCategory)}
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
                      onValueChange={(value) => handleInputChange("condition", value as ItemCondition)}
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
                      onChange={(e) => handleInputChange("price", e.target.value)}
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
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Switch
                    checked={formData.is_negotiable}
                    onCheckedChange={(checked) => handleInputChange("is_negotiable", checked)}
                  />
                  <Label>Price is negotiable</Label>
                </div>
              </CardContent>
            </Card>
          </motion.div>

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

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex gap-4"
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || uploadingImages}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
