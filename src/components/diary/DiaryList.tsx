import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useDiaryStore } from '../../stores/diaryStore';
import { useAuthStore } from '../../stores/authStore';
import { useGuestStore } from '../../stores/guestStore';
import { Button } from '../ui/Button';
import { DiaryCard } from './DiaryCard';
import { GuestDiaryCard } from '../guest/GuestDiaryCard';
import { EN } from '../../i18n/en';
import { Calendar, List, Plus, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import { enUS } from 'date-fns/locale';

type ViewMode = 'list' | 'calendar';

interface DiaryListProps {
  isGuest?: boolean;
}

export const DiaryList: React.FC<DiaryListProps> = ({ isGuest }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showRecorder, setShowRecorder] = useState(false);

  const { entries, loading, fetchEntries } = useDiaryStore();
  const { user } = useAuthStore();
  const { diaries: guestDiaries, getRemainingTries } = useGuestStore();

  useEffect(() => {
    if (!isGuest) {
      fetchEntries();
    }
  }, [isGuest, fetchEntries]);

  // Use guest diaries in guest mode, otherwise use normal entries
  const displayEntries = isGuest ? guestDiaries : entries;

  const getEntriesForDate = (date: Date) => {
    return displayEntries.filter(entry =>
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
            {days.map((day, index) => {
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
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {isGuest ? 'Guest Diary' : user?.role === 'parent' ? 'My Diary' : `${user?.name}'s Diary`}
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

          {(user?.role === 'parent' || isGuest) && (
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

      {/* Content */}
      {viewMode === 'calendar' ? (
        renderCalendarView()
      ) : (
        <div className="space-y-6">
          {displayEntries.length > 0 ? (
            displayEntries.map(entry => (
              isGuest ? (
                <GuestDiaryCard key={entry.id} diary={entry} />
              ) : (
                <DiaryCard key={entry.id} entry={entry} />
              )
            ))
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
              {(user?.role === 'parent' || isGuest) && (
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
