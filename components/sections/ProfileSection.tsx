import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Edit, Check, X, Download, Trash2, AlertTriangle, User as UserIcon, Loader2 } from "lucide-react";
import { User } from "../../lib/types";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MobileHeader } from "../MobileHeader";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProfileSectionProps {
  currentUser: User | null;
  isEditing: boolean;
  editedName: string;
  setEditedName: (name: string) => void;
  editedAge: string;
  setEditedAge: (age: string) => void;
  editedGender: string;
  setEditedGender: (gender: string) => void;
  handleEdit: () => void;
  handleSave: () => void;
  handleCancel: () => void;
  isLoading: boolean;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  currentUser,
  isEditing,
  editedName,
  setEditedName,
  editedAge,
  setEditedAge,
  editedGender,
  setEditedGender,
  handleEdit,
  handleSave,
  handleCancel,
  isLoading,
}) => {
  const isMobile = useIsMobile();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExportData = async () => {
    if (!currentUser?.uid) return;

    setIsExporting(true);
    try {
      const response = await fetch('/api/user/export-data?format=text', {
        method: 'GET',
        headers: {
          'x-user-id': currentUser.uid,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || 
                      `curez-data-export-${new Date().toISOString().split('T')[0]}.txt`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'Your data has been exported successfully!',
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Error',
        description: 'Failed to export data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      alert('Please type DELETE to confirm account deletion.');
      return;
    }

    if (!currentUser?.uid) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser.uid,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      // Account deleted successfully - logout and redirect
      alert('Your account has been permanently deleted. You will now be logged out.');
      
      // Logout using the auth API
      await fetch('/api/auth/logout', { method: 'POST' });
      
      // Redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error deleting account:', error);
      alert(`Failed to delete account: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setDeleteConfirmText("");
    }
  };

  return (
    <div className="p-4 md:p-6">
      {isMobile && <MobileHeader page="profile" />}
      {/* Two Column Layout - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column - Profile Information Card */}
        <Card className="bg-white/80 dark:bg-gray-950/70 border border-gray-200/60 dark:border-gray-800/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-orange-500" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={isEditing ? editedName : (currentUser?.name || "")}
                onChange={(e) => setEditedName(e.target.value)}
                className="mt-1"
                readOnly={!isEditing}
                placeholder="Enter your name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Age</label>
                <Input
                  type="number"
                  min="13"
                  max="25"
                  value={isEditing ? editedAge : (currentUser?.age?.toString() || "")}
                  onChange={(e) => setEditedAge(e.target.value)}
                  className="mt-1"
                  readOnly={!isEditing}
                  placeholder="Age"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Gender</label>
                {isEditing ? (
                  <Select
                    value={editedGender}
                    onValueChange={setEditedGender}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="prefer-not-to-say">
                        Prefer not to say
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={currentUser?.gender || ""}
                    className="mt-1"
                    readOnly
                    placeholder="Gender"
                  />
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                value={currentUser?.email || ""}
                className="mt-1 bg-muted"
                readOnly
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed.
              </p>
            </div>
            {!isEditing ? (
              <Button onClick={handleEdit} className="w-full bg-orange-500 text-white hover:bg-orange-600">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-orange-500 text-white hover:bg-orange-600"
                  disabled={isLoading}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {isLoading ? "Saving..." : "Save"}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Account Actions */}
        <div className="grid grid-rows-2 gap-6">
          {/* Export Data Card */}
          <Card className="bg-white/80 dark:bg-gray-950/70 border border-gray-200/60 dark:border-gray-800/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-orange-500" />
                Export Your Data
              </CardTitle>
              <CardDescription>
                Download a copy of your data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={handleExportData}
                disabled={isExporting || isEditing}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export My Data
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Delete Account Card */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Permanently delete your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting || isEditing}
                className="w-full"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete My Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This action cannot be undone. This will permanently delete your
                account and remove all your data from our servers, including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Personal information and profile data</li>
                <li>All journal entries</li>
                <li>Analytics and wellness metrics</li>
                
              </ul>
              <p className="font-semibold text-destructive">
                We recommend exporting your data before deleting your account.
              </p>
              <div className="mt-4">
                <label className="text-sm font-medium">
                  Type <span className="font-bold">DELETE</span> to confirm:
                </label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmText("");
              }}
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE" || isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete My Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
