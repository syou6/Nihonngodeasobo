import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDiaryStore } from '../../stores/diaryStore';
import { useAuthStore } from '../../stores/authStore';
import { useGuestStore } from '../../stores/guestStore';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { DiaryCard } from './DiaryCard';
import { GuestDiaryCard } from '../guest/GuestDiaryCard';
import { StudentListView } from './StudentListView';
import type { StudentInfo } from './StudentListView';
import { EN } from '../../i18n/en';
import { Calendar, List, Plus, ArrowLeft, Crown, Lock, Clock } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import { differenceInDays } from 'date-fns';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import { enUS } from 'date-fns/locale';
import type { DiaryEntry } from '../../types';

type ViewMode = 'list' | 'calendar';

interface DiaryListProps {
  isGuest?: boolean;
  onViewChange?: (view: string) => void;
}

export const DiaryList: React.FC<DiaryListProps> = ({ isGuest, onViewChange }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showRecorder, setShowRecorder] = useState(false);

  // Teacher state
  const [isTeacher, setIsTeacher] = useState(false);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string; relationshipId: string } | null>(null);
  const [studentEntries, setStudentEntries] = useState<DiaryEntry[]>([]);
  const [studentEntriesLoading, setStudentEntriesLoading] = useState(false);

  const { entries, loading, fetchEntries } = useDiaryStore();
  const { user } = useAuthStore();
  const { diaries: guestDiaries } = useGuestStore();
  const { isPremium, limits } = useSubscription();

  useEffect(() => {
    if (!isGuest) {
      fetchEntries();
    }
  }, [isGuest, fetchEntries]);

  // Check if user is a teacher (has students as teacher_id)
  const fetchStudents = useCallback(async () => {
    if (!user || isGuest) return;
    setStudentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('family_relationships')
        .select('id, last_viewed_at, learner:learner_id(id, name, email)')
        .eq('teacher_id', user.id)
        .eq('status', 'accepted');

      if (error) {
        return;
      }

      if (data && data.length > 0) {
        setIsTeacher(true);

        // Get unread counts for each student
        const studentInfos: StudentInfo[] = await Promise.all(
          data.map(async (rel: any) => {
            const learner = rel.learner;
            let unreadCount = 0;

            if (rel.last_viewed_at) {
              const { count } = await supabase
                .from('diaries')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', learner.id)
                .is('deleted_at', null)
                .gt('created_at', rel.last_viewed_at);
              unreadCount = count || 0;
            } else {
              const { count } = await supabase
                .from('diaries')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', learner.id)
                .is('deleted_at', null);
              unreadCount = count || 0;
            }

            return {
              relationshipId: rel.id,
              id: learner.id,
              name: learner.name,
              email: learner.email,
              unreadCount,
              lastViewedAt: rel.last_viewed_at,
            };
          })
        );

        setStudents(studentInfos);
      } else {
        setIsTeacher(false);
        setStudents([]);
      }
    } catch { /* ignored */ } finally {
      setStudentsLoading(false);
    }
  }, [user, isGuest]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Fetch student diary entries when a student is selected
  const handleSelectStudent = useCallback(async (student: { id: string; name: string; relationshipId: string }) => {
    setSelectedStudent(student);
    setStudentEntriesLoading(true);
    try {
      const { data, error } = await supabase
        .from('diaries')
        .select(`
          *,
          user:users(*),
          comments:comments(*, user:users(*))
        `)
        .eq('user_id', student.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
      } else {
        setStudentEntries(data || []);
      }

      // Update last_viewed_at
      await supabase.rpc('update_last_viewed', {
        relationship_id: student.relationshipId,
      });

      // Update local unread count
      setStudents(prev =>
        prev.map(s =>
          s.id === student.id ? { ...s, unreadCount: 0, lastViewedAt: new Date().toISOString() } : s
        )
      );
    } catch { /* ignored */ } finally {
      setStudentEntriesLoading(false);
    }
  }, []);

  const handleBackToStudentList = () => {
    setSelectedStudent(null);
    setStudentEntries([]);
  };

  // Use guest diaries in guest mode, otherwise use normal entries
  const displayEntries = isGuest ? guestDiaries : entries;

  // For teacher: filter to only own diaries
  const ownEntries = isTeacher
    ? displayEntries.filter(entry => entry.user_id === user?.id)
    : displayEntries;

  const getEntriesForDate = (date: Date) => {
    return ownEntries.filter(entry =>
      isSameDay(new Date(entry.created_at), date)
    );
  };

  const renderCalendarView = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
            {format(selectedDate, 'MMMM yyyy', { locale: enUS })}
          </h3>
          <div className="flex gap-1 sm:gap-2">
            <button
              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
              className="px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-lg text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Prev
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-lg text-blue-600 hover:text-blue-800 font-medium border border-blue-300 rounded-lg hover:bg-blue-50"
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
              className="px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-lg text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
              <div
                key={day}
                className={`p-2 sm:p-3 text-center text-xs sm:text-base font-bold border-b-2 border-gray-200 ${
                  index === 5 ? 'text-blue-600 bg-blue-50' :
                  index === 6 ? 'text-red-600 bg-red-50' :
                  'text-gray-700 bg-gray-50'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayEntries = getEntriesForDate(day);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, selectedDate);
              const isSelected = isSameDay(day, selectedDate);
              const dayOfWeek = day.getDay();
              const isSaturday = dayOfWeek === 6;
              const isSunday = dayOfWeek === 0;

              return (
                <motion.div
                  key={day.toISOString()}
                  whileHover={{ scale: 1.02 }}
                  className={`min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 border-b border-r border-gray-100 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-100 border-blue-300'
                      : isToday
                        ? 'bg-yellow-50'
                        : !isCurrentMonth
                          ? 'bg-gray-50'
                          : 'bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className={`text-sm sm:text-base font-medium ${
                    !isCurrentMonth
                      ? 'text-gray-300'
                      : isToday
                        ? 'text-white bg-blue-500 rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center mx-auto sm:mx-0'
                        : isSunday
                          ? 'text-red-500'
                          : isSaturday
                            ? 'text-blue-500'
                            : 'text-gray-900'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {dayEntries.length > 0 && isCurrentMonth && (
                    <div className="mt-1 space-y-0.5 hidden sm:block">
                      {dayEntries.slice(0, 2).map(entry => (
                        <div
                          key={entry.id}
                          className="text-xs bg-blue-500 text-white rounded px-1 py-0.5 truncate"
                        >
                          {entry.ai_summary?.slice(0, 8) || entry.content.slice(0, 8)}...
                        </div>
                      ))}
                      {dayEntries.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{dayEntries.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                  {dayEntries.length > 0 && isCurrentMonth && (
                    <div className="sm:hidden mt-1 flex justify-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      {dayEntries.length > 1 && (
                        <span className="text-xs text-blue-500 ml-0.5">{dayEntries.length}</span>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Entries */}
        <div className="mt-6 sm:mt-8">
          <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
            {format(selectedDate, 'EEEE, MMMM d', { locale: enUS })}
          </h4>
          <div className="space-y-4">
            {getEntriesForDate(selectedDate).map(entry => (
              isGuest ? (
                <GuestDiaryCard key={entry.id} diary={entry} />
              ) : (
                <DiaryCard key={entry.id} entry={entry} />
              )
            ))}
            {getEntriesForDate(selectedDate).length === 0 && (
              <div className="text-center py-6 sm:py-8 text-gray-500 text-base sm:text-lg bg-gray-50 rounded-xl">
                No diary entries for this day
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-64 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500">{EN.common.loading}</p>
        <button
          onClick={() => {
            fetchEntries();
          }}
          className="text-blue-600 underline text-sm mt-2"
        >
          Taking too long? Tap to retry
        </button>
      </div>
    );
  }

  // Teacher viewing a selected student's diaries
  if (selectedStudent) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleBackToStudentList}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {selectedStudent.name}'s Diary
          </h1>
        </div>

        {studentEntriesLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : studentEntries.length > 0 ? (
          <div className="space-y-6">
            {studentEntries.map(entry => (
              <DiaryCard key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-lg text-gray-600">No diary entries yet</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Teacher: Student List */}
      {isTeacher && !isGuest && (
        <div className="mb-8">
          <StudentListView
            students={students}
            loading={studentsLoading}
            onSelectStudent={handleSelectStudent}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {isGuest ? 'Guest Diary' : 'My Diary'}
        </h1>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="flex bg-gray-100 rounded-xl p-1 w-full sm:w-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-base sm:text-lg font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-base sm:text-lg font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                viewMode === 'calendar'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="sm:inline">Calendar</span>
            </button>
          </div>

          {(user?.role === 'learner' || isGuest) && (
            <Button
              onClick={() => setShowRecorder(true)}
              variant="primary"
              className="w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              New Diary
            </Button>
          )}
        </div>
      </div>

      {/* Storage warning banner for free users */}
      {!isGuest && !isPremium && !isTeacher && onViewChange && limits.storageRetentionDays !== null && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm font-medium text-amber-800">
              Free diaries are deleted after {limits.storageRetentionDays} days
            </span>
          </div>
          <button
            onClick={() => onViewChange('pricing')}
            className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 flex-shrink-0"
          >
            <Lock className="w-3 h-3" />
            Unlock unlimited storage
          </button>
        </motion.div>
      )}

      {/* Content */}
      {viewMode === 'calendar' ? (
        renderCalendarView()
      ) : (
        <div className="space-y-6">
          {ownEntries.length > 0 ? (
            ownEntries.map((entry, index) => {
              const card = isGuest ? (
                <GuestDiaryCard key={entry.id} diary={entry} />
              ) : (
                <DiaryCard key={entry.id} entry={entry} />
              );

              // Show expiry warning badge on entries approaching 7-day limit
              const daysOld = differenceInDays(new Date(), new Date(entry.created_at));
              const isExpiringSoon = !isGuest && !isPremium && limits.storageRetentionDays !== null && daysOld >= limits.storageRetentionDays - 2;

              const cardWithBadge = isExpiringSoon ? (
                <div key={entry.id} className="relative">
                  {card}
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-orange-100 border border-orange-300 rounded-full text-xs font-semibold text-orange-700">
                    <Clock className="w-3 h-3" />
                    Expires soon
                  </div>
                </div>
              ) : card;

              // Insert premium teaser card after first entry for free users
              if (!isGuest && !isPremium && index === 0 && ownEntries.length >= 1 && onViewChange) {
                return (
                  <React.Fragment key={`${entry.id}-with-teaser`}>
                    {cardWithBadge}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative overflow-hidden rounded-2xl border-2 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 to-brand-50 p-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                          <Crown className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 mb-1">Unlock your full learning potential</h3>
                          <p className="text-sm text-gray-600 mb-3">
                            Premium gives you unlimited diaries, detailed AI grammar feedback, and your entries are kept forever.
                          </p>
                          <button
                            onClick={() => onViewChange('pricing')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-purple-500 text-white text-sm font-bold rounded-xl hover:from-brand-600 hover:to-purple-600 transition-all shadow-md"
                          >
                            <Crown className="w-4 h-4" />
                            Upgrade to Premium — ¥980/month
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </React.Fragment>
                );
              }

              return cardWithBadge;
            })
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 bg-gray-50 rounded-2xl"
            >
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {EN.diary.empty}
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                {EN.diary.startFirst}
              </p>
              {(user?.role === 'learner' || isGuest) && (
                <Button onClick={() => setShowRecorder(true)} size="lg">
                  <Plus className="w-6 h-6" />
                  {EN.dashboard.recordButton}
                </Button>
              )}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};
