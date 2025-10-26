import React from 'react';
import { useQuery } from 'react-query';
import { Newspaper, Calendar, User, ArrowRight } from 'lucide-react';
import { reportsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';
import { formatDate } from '../../utils/helpers';
import { useNavigate } from 'react-router-dom';


const NewsWidget = ({ limit = 3, showHeader = true, onViewAll }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Fetch news data
  const { data: news, isLoading: newsLoading } = useQuery(
    'news',
    reportsAPI.getNews,
    { 
      enabled: !!user,
      refetchInterval: 300000, // Refetch every 5 minutes
    }
  );

  // Filter and sort news
  const getFilteredNews = () => {
    if (!news) return [];
    
    const now = new Date();
    return news
      .filter(item => {
        // Only show active news
        if (!item.is_active) return false;
        
        // Check if news has expired
        if (item.end_at) {
          const endDate = new Date(item.end_at);
          if (endDate < now) return false;
        }
        
        // Filter by user role and news type
        if (user?.role === 'admin') {
          return true; // Admin can see all news
        } else {
          return item.type === 'school' || item.type === 'global';
        }
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  };

  const filteredNews = getFilteredNews();

  if (newsLoading) {
    return (
      <div className="card">
        
        {showHeader && (
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">الأخبار والإعلانات</h3>
            
          </div>
        )}
        <div className="card-body">
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="sm" />
            <span className="mr-3 text-gray-500">جاري تحميل الأخبار...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!filteredNews || filteredNews.length === 0) {
    return (
      <div className="card">
        {showHeader && (
          <div className="card-header flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">الأخبار والإعلانات</h3>
            <button
              onClick={() => navigate('/app/news')}
              className="btn btn-primary btn-sm "
              // فقط للمديرين ومدراء المدارس
              disabled={user?.role !== 'admin' && user?.role !== 'school_admin'}
              title="عرض جميع الأخبار"
            >
              <span className="inline-flex items-center">
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
                عرض جميع الأخبار
              </span>
            </button>
          </div>
          
        )}
        <div className="card-body">
          <div className="text-center py-8">
            <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Newspaper className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-500">لا توجد أخبار جديدة</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {showHeader && (
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">الأخبار والإعلانات</h3>
            {onViewAll && (
              <button
                onClick={onViewAll}
                className="text-sm text-primary-600 hover:text-primary-900 flex items-center"
              >
                عرض الكل
                <ArrowRight className="h-4 w-4 mr-1" />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="card-body">
        <div className="space-y-4">
          {filteredNews.map((newsItem, index) => (
            <div
              key={newsItem.id}
              className={`p-4 rounded-lg border ${
                index === 0 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  index === 0 
                    ? 'bg-blue-100' 
                    : 'bg-gray-100'
                }`}>
                  <Newspaper className={`h-5 w-5 ${
                    index === 0 
                      ? 'text-blue-600' 
                      : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className={`text-sm font-medium ${
                      index === 0 
                        ? 'text-blue-900' 
                        : 'text-gray-900'
                    }`}>
                      {newsItem.title}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      newsItem.type === 'global' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {newsItem.type === 'global' ? 'عام' : 'مدرسي'}
                    </span>
                  </div>
                  <p className={`text-sm ${
                    index === 0 
                      ? 'text-blue-700' 
                      : 'text-gray-600'
                  } md:block hidden`} style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {newsItem.description}
                  </p>
                  {/* Mobile version - show full description */}
                  <p className={`text-sm ${
                    index === 0 
                      ? 'text-blue-700' 
                      : 'text-gray-600'
                  } block md:hidden`}>
                    {newsItem.description}
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center text-xs text-gray-500">
                      <User className="h-3 w-3 mr-1" />
                      {newsItem.created_by_name}
                    </div>
                    <div className="flex items-center text-xs text-gray-500 ">
                      <Calendar className="h-3 w-3 mr-4" />
                      <span className="text-xs">{newsItem.created_at}</span>
                    </div>
                    {newsItem.end_at && (
                      <div className="flex items-center text-xs text-orange-600">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span className="text-xs">ينتهي: {newsItem.end_at}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewsWidget;
