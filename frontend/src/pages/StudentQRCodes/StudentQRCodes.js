import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery } from 'react-query';
import { Download, Search, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { usersAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import StudentQRCode from '../../components/StudentQRCode/StudentQRCode';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import toast from 'react-hot-toast';

const MAX_SELECTABLE = 50;

const StudentQRCodes = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const cardRefsMap = useRef(new Map());
  const itemsPerPage = window.innerWidth <= 768 ? 20 : 100;
  
  const { data: students, isLoading } = useQuery(
    'allStudents',
    usersAPI.getMySchoolStudents
  );
  
  // Get unique students by ID (deduplicate)
  const uniqueStudents = useMemo(() => {
    if (!students) return [];
    const seen = new Map();
    students.forEach(student => {
      if (!seen.has(student.id)) {
        seen.set(student.id, student);
      }
    });
    return Array.from(seen.values());
  }, [students]);
  
  // Get unique class names for filter
  const classNames = useMemo(() => {
    const classes = new Set();
    uniqueStudents.forEach(student => {
      if (student.class_name) {
        classes.add(student.class_name);
      }
    });
    return Array.from(classes).sort();
  }, [uniqueStudents]);
  
  // Filter students
  const filteredStudents = useMemo(() => {
    return uniqueStudents.filter(student => {
      // Search filter
      const matchesSearch = !searchTerm || 
        student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.username?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Class filter
      const matchesClass = !filterClass || student.class_name === filterClass;
      
      // Active filter
      const matchesActive = filterActive === 'all' || 
        (filterActive === 'active' && student.is_active) ||
        (filterActive === 'inactive' && !student.is_active);
      
      return matchesSearch && matchesClass && matchesActive;
    });
  }, [uniqueStudents, searchTerm, filterClass, filterActive]);
  
  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredStudents.slice(start, end);
  }, [filteredStudents, currentPage, itemsPerPage]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterClass, filterActive]);

  useEffect(() => {
    setSelectedIds([]);
  }, [currentPage]);

  const registerCardRef = useCallback((id, el) => {
    if (el) cardRefsMap.current.set(id, el);
    else cardRefsMap.current.delete(id);
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX_SELECTABLE
          ? prev
          : [...prev, id]
    );
  }, []);

  const selectAllOnPage = useCallback(() => {
    const ids = paginatedStudents.slice(0, MAX_SELECTABLE).map((s) => s.id);
    setSelectedIds(ids);
  }, [paginatedStudents]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const downloadSelected = useCallback(async () => {
    if (selectedIds.length === 0) {
      toast.error('لم يتم اختيار أي بطاقة');
      return;
    }
    const studentsById = new Map(filteredStudents.map((s) => [s.id, s]));
    let done = 0;
    for (const id of selectedIds) {
      const el = cardRefsMap.current.get(id);
      const student = studentsById.get(id);
      if (!el || !student) continue;
      try {
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
          logging: false,
        });
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${student.fullName || student.username || 'card'}.png`.replace(/[<>:"/\\|?*]/g, '_');
        link.click();
        done++;
        await new Promise((r) => setTimeout(r, 400));
      } catch (e) {
        console.error('Download failed for', id, e);
      }
    }
    if (done > 0) toast.success(`تم تحميل ${done} بطاقة`);
    if (done < selectedIds.length) toast.error(`لم يتم تحميل ${selectedIds.length - done} بطاقة (غير ظاهرة في الصفحة)`);
  }, [selectedIds, filteredStudents]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">رموز QR للطلاب</h1>
          <p className="text-gray-600">طباعة وتحميل رموز QR للحافلة</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">اختر حتى {MAX_SELECTABLE} بطاقة ثم حمّل كصور</span>
          <button
            type="button"
            onClick={selectAllOnPage}
            className="btn btn-outline text-sm"
          >
            تحديد الكل
          </button>
          <button
            type="button"
            onClick={clearSelection}
            disabled={selectedIds.length === 0}
            className="btn btn-outline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            إلغاء التحديد
          </button>
          <button
            onClick={downloadSelected}
            disabled={selectedIds.length === 0}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-5 w-5 mr-2 ml-2" />
            تحميل المحدد ({selectedIds.length})
          </button>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="card print:hidden">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="label">البحث</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="البحث بالاسم أو اسم المستخدم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pr-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Class Filter */}
            <div>
              <label className="label">الفصل</label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="input"
              >
                <option value="">جميع الفصول</option>
                {classNames.map(className => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
            </div>
            
            {/* Active Filter */}
            <div>
              <label className="label">الحالة</label>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="input"
              >
                <option value="all">الكل</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
          </div>
          
          {/* Active Filters Display */}
          {(searchTerm || filterClass || filterActive !== 'all') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700">الفلاتر النشطة:</span>
                {searchTerm && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    البحث: "{searchTerm}"
                    <button
                      onClick={() => setSearchTerm('')}
                      className="mr-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filterClass && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    الفصل: {filterClass}
                    <button
                      onClick={() => setFilterClass('')}
                      className="mr-1 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filterActive !== 'all' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    الحالة: {filterActive === 'active' ? 'نشط' : 'غير نشط'}
                    <button
                      onClick={() => setFilterActive('all')}
                      className="mr-1 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterClass('');
                    setFilterActive('all');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  مسح الكل
                </button>
              </div>
            </div>
          )}
          
          {/* Results Count */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              عرض <strong className="text-gray-900">{filteredStudents.length}</strong> من أصل <strong className="text-gray-900">{uniqueStudents.length}</strong> طالب
            </p>
          </div>
        </div>
      </div>
      
      {!uniqueStudents || uniqueStudents.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <p className="text-gray-500 text-lg">لا توجد طلاب في المدرسة</p>
          </div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <p className="text-gray-500 text-lg">لا توجد نتائج تطابق الفلاتر المحددة</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 print:grid-cols-4">
            {paginatedStudents.map((student) => (
              <StudentQRCode
                key={student.id}
                student={student}
                schoolName={student.school_name || user?.school_name}
                isSelected={selectedIds.includes(student.id)}
                onToggleSelect={() => toggleSelect(student.id)}
                registerCardRef={registerCardRef}
                canSelect={selectedIds.length < MAX_SELECTABLE || selectedIds.includes(student.id)}
              />
            ))}
          </div>
          
          {/* Pagination Controls (mobile-friendly) */}
          {totalPages > 1 && (
            <div className="card print:hidden mt-6">
              <div className="card-body">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    صفحة {currentPage} من {totalPages} ({filteredStudents.length} طالب)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 rounded-lg border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                    >
                      الأولى
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                    >
                      السابق
                    </button>
                    <span className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
                      {currentPage}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                    >
                      التالي
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 rounded-lg border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                    >
                      الأخيرة
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentQRCodes;
