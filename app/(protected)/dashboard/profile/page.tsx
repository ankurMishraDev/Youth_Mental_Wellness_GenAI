'use client';

import { ProfileSection } from '@/components/sections/ProfileSection';
import { DashboardHeader } from '@/components/DashboardHeader';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';

export default function ProfilePage() {
  const auth = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedAge, setEditedAge] = useState('');
  const [editedGender, setEditedGender] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (auth.currentUser) {
      setEditedName(auth.currentUser.name || '');
      setEditedAge(auth.currentUser.age?.toString() || '');
      setEditedGender(auth.currentUser.gender || '');
    }
  }, [auth.currentUser]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (auth.currentUser) {
      setEditedName(auth.currentUser.name || '');
      setEditedAge(auth.currentUser.age?.toString() || '');
      setEditedGender(auth.currentUser.gender || '');
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!auth.currentUser?.uid) return;

    if (!editedName.trim() && !editedAge.trim() && !editedGender.trim()) {
      alert('Please fill in at least one field before saving.');
      return;
    }

    setIsLoading(true);
    try {
      const updateData: any = {
        uid: auth.currentUser.uid,
      };
      
      if (editedName.trim()) {
        updateData.name = editedName.trim();
      }
      if (editedAge.trim()) {
        updateData.age = editedAge.trim();
      }
      if (editedGender.trim()) {
        updateData.gender = editedGender.trim();
      }

      const response = await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const updatedUser = {
          ...auth.currentUser,
          name: editedName.trim() || auth.currentUser.name,
          age: editedAge.trim() ? parseInt(editedAge) : auth.currentUser.age,
          gender: editedGender.trim() || auth.currentUser.gender,
        };

        auth.updateCurrentUser(updatedUser);
        setIsEditing(false);
        alert('Profile updated successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to update profile: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-200 dark:bg-gray-900 p-2 md:p-4">
      <DashboardHeader 
        title="Profile Settings"
        description="Manage your personal information."
        currentUser={auth.currentUser} 
      />
      <ProfileSection
        currentUser={auth.currentUser}
        isEditing={isEditing}
        editedName={editedName}
        setEditedName={setEditedName}
        editedAge={editedAge}
        setEditedAge={setEditedAge}
        editedGender={editedGender}
        setEditedGender={setEditedGender}
        handleEdit={handleEdit}
        handleSave={handleSave}
        handleCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  );
}
