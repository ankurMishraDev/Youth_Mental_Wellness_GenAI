/* eslint-disable react/forbid-dom-props */
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/lib/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Plus, Tag, Trash2, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Category {
  id: string;
  title: string;
  description: string | null;
  color: string;
  userId: string | null;
  isDefault: boolean;
  createdAt: string;
}

const PRESET_COLORS = [
  'var(--primary)',     // purple
  'var(--accent)',      // pink
  'var(--secondary)',   // blue
  'var(--mood-happy)',  // green
  'var(--mood-sad)',    // orange/amber
  'var(--destructive)', // red
  'var(--chart-4)',     // cyan
  'var(--chart-5)',     // green
];

export function CategoriesSection() {
  const { user } = useUser();
  const userId = user?.uid;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    color: PRESET_COLORS[0]
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    if (userId) {
      fetchCategories();
    }
  }, [userId]);

  const fetchCategories = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await fetch('/api/categories', {
        headers: {
          'x-user-id': userId
        }
      });

      const data = await response.json();
      console.log('API Response:', data);
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!formData.title.trim() || !userId) return;

    try {
      setSubmitting(true);
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        setCategories([...categories, data.category]);
        setIsCreateModalOpen(false);
        setFormData({ title: '', description: '', color: PRESET_COLORS[0] });
      }
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const defaultCategories = categories.filter(c => c.isDefault);
  const customCategories = categories.filter(c => !c.isDefault);

  return (
    <div className="bg-white/80 dark:bg-gray-950/70 rounded-lg shadow-sm p-6 border border-gray-200/60 dark:border-gray-800/50">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
          <Tag className="w-5 h-5 text-orange-500" />
          Categories
        </h2>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Plus className="w-4 h-4 mr-1"/>
          New Category
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading categories...</div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto pr-2">
          {/* Default Categories */}
          {defaultCategories.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Default Categories</h3>
              <div className="grid grid-cols-2 gap-3">
                {defaultCategories.map((category) => (
                  <div
                    key={category.id}
                    className="p-3 rounded-lg border-2 hover:shadow-sm transition-shadow bg-card"
                    // eslint-disable-next-line react/forbid-dom-props
                    style={{ borderColor: category.color } as React.CSSProperties}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        // eslint-disable-next-line react/forbid-dom-props
                        style={{ backgroundColor: category.color } as React.CSSProperties}
                      />
                      <span className="font-medium text-sm text-card-foreground">
                        {category.title}
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {category.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Categories */}
          {customCategories.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">My Custom Categories</h3>
              <div className="grid grid-cols-2 gap-3">
                {customCategories.map((category) => (
                  <div
                    key={category.id}
                    className="p-3 rounded-lg border-2 hover:shadow-sm transition-shadow group relative bg-card"
                    // eslint-disable-next-line react/forbid-dom-props
                    style={{ borderColor: category.color } as React.CSSProperties}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        // eslint-disable-next-line react/forbid-dom-props
                        style={{ backgroundColor: category.color } as React.CSSProperties}
                      />
                      <span className="font-medium text-sm text-card-foreground">
                        {category.title}
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {category.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {categories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No categories yet. Create your first custom category!
            </div>
          )}
        </div>
      )}

      {/* Create Category Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Custom Category</DialogTitle>
            <DialogDescription>
              Add a new category to organize your journal entries
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Category Name *</Label>
              <Input
                id="title"
                placeholder="e.g., Personal Projects"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of what this category is for..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label>Category Color</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full transition-all ${
                      formData.color === color
                        ? 'ring-2 ring-offset-2 ring-primary scale-110'
                        : 'hover:scale-105'
                    }`}
                    // eslint-disable-next-line react/forbid-dom-props
                    style={{ backgroundColor: color.startsWith('var') ? `rgb(from ${color} r g b)` : color } as React.CSSProperties}
                    aria-label={`Select color ${index + 1}`}
                    title={`Select color ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="pt-2">
              <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
              <div
                className="p-3 rounded-lg border-2 bg-card"
                // eslint-disable-next-line react/forbid-dom-props
                style={{ borderColor: formData.color } as React.CSSProperties}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    // eslint-disable-next-line react/forbid-dom-props
                    style={{ backgroundColor: formData.color } as React.CSSProperties}
                  />
                  <span className="font-medium text-sm text-card-foreground">
                    {formData.title || 'Category Name'}
                  </span>
                </div>
                {formData.description && (
                  <p className="text-xs text-muted-foreground">
                    {formData.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={!formData.title.trim() || submitting}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {submitting ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
