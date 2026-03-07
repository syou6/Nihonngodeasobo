import React from 'react';
import { motion } from 'framer-motion';
import { Users, ChevronRight } from 'lucide-react';

interface StudentInfo {
  relationshipId: string;
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  unreadCount: number;
  lastViewedAt: string | null;
}

interface StudentListViewProps {
  students: StudentInfo[];
  loading: boolean;
  onSelectStudent: (student: { id: string; name: string; relationshipId: string }) => void;
}

export const StudentListView: React.FC<StudentListViewProps> = ({
  students,
  loading,
  onSelectStudent,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-2xl">
        <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg text-gray-600">No students connected yet</p>
        <p className="text-sm text-gray-500 mt-1">
          Students can invite you from their Share page
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-600" />
        Students ({students.length})
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {students.map((student) => (
          <motion.button
            key={student.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() =>
              onSelectStudent({
                id: student.id,
                name: student.name,
                relationshipId: student.relationshipId,
              })
            }
            className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left w-full"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-semibold text-blue-600">
                {student.name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 truncate">
                {student.name || 'Student'}
              </div>
              <div className="text-sm text-gray-500 truncate">{student.email}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {student.unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
                  {student.unreadCount}
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export type { StudentInfo };
