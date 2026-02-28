import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { GraduationCap, UserPlus, X, Eye, BookOpen } from 'lucide-react';
import { EN } from '../../i18n/en';
import toast from 'react-hot-toast';

interface FamilyMember {
  id: string;
  parent_id: string;
  child_id: string;
  status: 'accepted';
  parent?: any;
  child?: any;
  created_at: string;
}

export const FamilyManager: React.FC = () => {
  const { user } = useAuthStore();
  const [emailInput, setEmailInput] = useState('');
  const [sharedWith, setSharedWith] = useState<FamilyMember[]>([]);
  const [sharedFrom, setSharedFrom] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchFamilyMembers();
    }
  }, [user]);

  const fetchFamilyMembers = async () => {
    if (!user) return;

    try {
      const { data: shared, error: sharedError } = await supabase
        .from('family_relationships')
        .select(`
          *,
          child:child_id(id, name, email)
        `)
        .eq('parent_id', user.id)
        .eq('status', 'accepted');

      if (sharedError) {
        console.error('Error fetching shared:', sharedError);
      } else {
        setSharedWith(shared || []);
      }

      const { data: sharedToMe, error: sharedToMeError } = await supabase
        .from('family_relationships')
        .select(`
          *,
          parent:parent_id(id, name, email)
        `)
        .eq('child_id', user.id)
        .eq('status', 'accepted');

      if (sharedToMeError) {
        console.error('Error fetching shared to me:', sharedToMeError);
      } else {
        setSharedFrom(sharedToMe || []);
      }
    } catch (error) {
      console.error('Error fetching family members:', error);
    }
  };

  const addFamilyMember = async () => {
    if (!user || !emailInput.trim()) return;

    setLoading(true);
    try {
      // Use RPC function to bypass RLS (users can only see own profile)
      const { data: searchResults, error: searchError } = await supabase
        .rpc('search_user_by_email', { search_email: emailInput.trim() });

      if (searchError) {
        console.error('User search error:', searchError);
        toast.error(EN.family.userNotFound);
        return;
      }

      const targetUser = searchResults?.[0];
      if (!targetUser) {
        toast.error(EN.family.userNotFound);
        return;
      }

      if (targetUser.id === user.id) {
        toast.error(EN.family.cannotAddSelf);
        return;
      }

      const { data: existing } = await supabase
        .from('family_relationships')
        .select('id')
        .eq('parent_id', user.id)
        .eq('child_id', targetUser.id)
        .single();

      if (existing) {
        toast.error(EN.family.alreadyShared);
        return;
      }

      const { error } = await supabase
        .from('family_relationships')
        .insert({
          parent_id: user.id,
          child_id: targetUser.id,
          status: 'accepted'
        });

      if (!error) {
        toast.success(`${EN.family.shareSuccess} ${targetUser.name}`);
        setEmailInput('');
        fetchFamilyMembers();
      }
    } catch (error) {
      toast.error(EN.family.addError);
    } finally {
      setLoading(false);
    }
  };

  const removeFamilyMember = async (relationshipId: string) => {
    if (!window.confirm(EN.family.removeConfirm)) {
      return;
    }

    setDeletingId(relationshipId);

    try {
      const { data, error } = await supabase
        .rpc('delete_family_relationship', {
          relationship_id: relationshipId
        });

      if (error) {
        console.error('Delete error:', error);
        toast.error(`${EN.family.addError}: ${error.message}`);
        await fetchFamilyMembers();
      } else {
        setSharedWith(prev => prev.filter(m => m.id !== relationshipId));
        setSharedFrom(prev => prev.filter(m => m.id !== relationshipId));
        toast.success(EN.family.removed);
        await fetchFamilyMembers();
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast.error(`${EN.family.addError}: ${error.message || 'Unknown error'}`);
      await fetchFamilyMembers();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-6 sm:p-8"
      >
        <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
          <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900">{EN.family.title}</h2>
        </div>

        {/* Add recipient */}
        <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-blue-50 rounded-xl">
          <h3 className="text-lg sm:text-xl font-bold text-blue-900 mb-3 sm:mb-4">
            <Eye className="inline w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
            {EN.family.addRecipient}
          </h3>
          <p className="text-sm sm:text-lg text-blue-800 mb-3 sm:mb-4">
            {EN.family.addDescription}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="example@email.com"
              className="flex-1 p-3 sm:p-4 text-base sm:text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button
              onClick={addFamilyMember}
              variant="primary"
              disabled={loading || !emailInput.includes('@')}
              className="w-full sm:w-auto"
            >
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">{EN.family.addButton}</span>
            </Button>
          </div>
        </div>

        {/* Your teacher */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            <GraduationCap className="inline w-5 h-5 mr-2 text-blue-600" />
            {EN.family.yourViewers}
          </h3>
          <div className="space-y-3">
            {sharedWith.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl gap-2"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold flex-shrink-0">
                    {member.child?.name?.[0] || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-base sm:text-lg truncate">
                      {member.child?.name || EN.family.user}
                    </div>
                    <div className="text-sm sm:text-base text-gray-500 truncate">
                      {member.child?.email}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFamilyMember(member.id)}
                  disabled={deletingId === member.id}
                  className="flex-shrink-0"
                >
                  {deletingId === member.id ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                  )}
                  <span className="hidden sm:inline">{EN.family.remove}</span>
                </Button>
              </div>
            ))}
            {sharedWith.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {EN.family.noSharing}
              </div>
            )}
          </div>
        </div>

        {/* Students you teach */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            <BookOpen className="inline w-5 h-5 mr-2 text-green-600" />
            {EN.family.youCanView}
          </h3>
          <div className="space-y-3">
            {sharedFrom.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-green-50 rounded-xl gap-2"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold flex-shrink-0">
                    {member.parent?.name?.[0] || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-base sm:text-lg truncate">
                      {member.parent?.name || EN.family.user}
                    </div>
                    <div className="text-sm sm:text-base text-gray-500 truncate">
                      {member.parent?.email}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFamilyMember(member.id)}
                  disabled={deletingId === member.id}
                  className="flex-shrink-0"
                >
                  {deletingId === member.id ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                  )}
                  <span className="hidden sm:inline">{EN.family.remove}</span>
                </Button>
              </div>
            ))}
            {sharedFrom.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {EN.family.noViewers}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
