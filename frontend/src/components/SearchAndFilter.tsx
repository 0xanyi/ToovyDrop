import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  X,
  Calendar,
  HardDrive,
  FileType,
  Clock,
  Image,
  Film,
  FileText,
  Archive,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { FileFilters } from '../types';

interface SearchAndFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: FileFilters;
  onFiltersChange: (filters: FileFilters) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  totalFiles: number;
  className?: string;
}

interface FilterPreset {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  filters: Partial<FileFilters>;
  description: string;
}

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  showFilters,
  onToggleFilters,
  totalFiles,
  className = ''
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Debounce search query
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);

  // Update parent when debounced value changes
  useEffect(() => {
    onSearchChange(debouncedSearchQuery);
  }, [debouncedSearchQuery, onSearchChange]);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  // Filter presets
  const filterPresets: FilterPreset[] = [
    {
      id: 'recent',
      name: 'Recent Files',
      icon: Clock,
      description: 'Files uploaded in the last 7 days',
      filters: {
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      }
    },
    {
      id: 'large-files',
      name: 'Large Files',
      icon: HardDrive,
      description: 'Files larger than 10MB',
      filters: {
        sizeRange: {
          min: 10 * 1024 * 1024 // 10MB
        }
      }
    },
    {
      id: 'images',
      name: 'Images',
      icon: Image,
      description: 'All image files',
      filters: {
        mimeType: 'image'
      }
    },
    {
      id: 'videos',
      name: 'Videos',
      icon: Film,
      description: 'All video files',
      filters: {
        mimeType: 'video'
      }
    },
    {
      id: 'documents',
      name: 'Documents',
      icon: FileText,
      description: 'PDF and text documents',
      filters: {
        mimeType: 'application/pdf'
      }
    },
    {
      id: 'archives',
      name: 'Archives',
      icon: Archive,
      description: 'ZIP, RAR and other archives',
      filters: {
        mimeType: 'application/zip'
      }
    }
  ];

  // Search suggestions based on common file types and patterns
  const generateSearchSuggestions = useCallback((query: string): string[] => {
    if (!query || query.length < 2) return [];

    const suggestions: string[] = [];
    const lowerQuery = query.toLowerCase();

    // File extension suggestions
    const extensions = ['.pdf', '.jpg', '.png', '.mp4', '.zip', '.doc', '.txt', '.xlsx'];
    extensions.forEach(ext => {
      if (ext.includes(lowerQuery)) {
        suggestions.push(`Files with ${ext} extension`);
      }
    });

    // Common search terms
    const commonTerms = ['screenshot', 'document', 'image', 'video', 'backup', 'report', 'presentation'];
    commonTerms.forEach(term => {
      if (term.includes(lowerQuery)) {
        suggestions.push(term);
      }
    });

    // Date-based suggestions
    if (['today', 'yesterday', 'week', 'month'].some(term => term.includes(lowerQuery))) {
      suggestions.push('Files from today', 'Files from this week', 'Files from this month');
    }

    return suggestions.slice(0, 5);
  }, []);

  // Update search suggestions when query changes
  useEffect(() => {
    const suggestions = generateSearchSuggestions(localSearchQuery);
    setSearchSuggestions(suggestions);
  }, [localSearchQuery, generateSearchSuggestions]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearchQuery(value);
    setShowSuggestions(value.length > 0);
  };

  const handleSearchSuggestionClick = (suggestion: string) => {
    setLocalSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  const handleFilterChange = (newFilters: Partial<FileFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    onFiltersChange(updatedFilters);
    setSelectedPreset(null); // Clear preset selection when manually changing filters
  };

  const handlePresetClick = (preset: FilterPreset) => {
    if (selectedPreset === preset.id) {
      // Deselect preset and clear filters
      setSelectedPreset(null);
      onFiltersChange({});
    } else {
      // Apply preset filters
      setSelectedPreset(preset.id);
      onFiltersChange(preset.filters);
    }
  };

  const clearAllFilters = () => {
    onFiltersChange({});
    setLocalSearchQuery('');
    setSelectedPreset(null);
  };

  const hasActiveFilters = localSearchQuery || Object.values(filters).some(v => v !== undefined);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-4">
        {/* Search bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex-1 max-w-md relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search files by name, type, or content..."
                value={localSearchQuery}
                onChange={handleSearchInputChange}
                onFocus={() => setShowSuggestions(localSearchQuery.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {localSearchQuery && (
                <button
                  onClick={() => {
                    setLocalSearchQuery('');
                    setShowSuggestions(false);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search suggestions */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-2">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchSuggestionClick(suggestion)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Search className="w-3 h-3 inline mr-2 text-gray-400" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter toggle and results count */}
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {totalFiles > 0 ? `${totalFiles} file${totalFiles === 1 ? '' : 's'}` : 'No files'}
            </div>
            <button
              onClick={onToggleFilters}
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors
                ${hasActiveFilters
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-gray-300 text-gray-500 hover:border-gray-400'
                }
              `}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
              {showFilters ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Filter presets */}
        <div className="mt-4">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Quick filters:</span>
            {filterPresets.map((preset) => {
              const Icon = preset.icon;
              const isSelected = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset)}
                  className={`
                    flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                    ${isSelected
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                  title={preset.description}
                >
                  <Icon className="w-3 h-3" />
                  <span>{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div className="border-t border-gray-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* File type filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileType className="w-4 h-4 inline mr-1" />
                File type
              </label>
              <select
                value={filters.mimeType || ''}
                onChange={(e) => handleFilterChange({ mimeType: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All types</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="audio">Audio</option>
                <option value="application/pdf">PDF</option>
                <option value="text">Text files</option>
                <option value="application/zip">Archives</option>
              </select>
            </div>

            {/* Size range filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <HardDrive className="w-4 h-4 inline mr-1" />
                Min size (MB)
              </label>
              <input
                type="number"
                placeholder="0"
                min="0"
                step="0.1"
                value={filters.sizeRange?.min ? Math.round((filters.sizeRange.min || 0) / (1024 * 1024) * 10) / 10 : ''}
                onChange={(e) => handleFilterChange({
                  sizeRange: {
                    min: e.target.value ? Number(e.target.value) * 1024 * 1024 : undefined,
                    max: filters.sizeRange?.max
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <HardDrive className="w-4 h-4 inline mr-1" />
                Max size (MB)
              </label>
              <input
                type="number"
                placeholder="No limit"
                min="0"
                step="0.1"
                value={filters.sizeRange?.max ? Math.round((filters.sizeRange.max || 0) / (1024 * 1024) * 10) / 10 : ''}
                onChange={(e) => handleFilterChange({
                  sizeRange: {
                    min: filters.sizeRange?.min,
                    max: e.target.value ? Number(e.target.value) * 1024 * 1024 : undefined
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Date range filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                From date
              </label>
              <input
                type="date"
                value={filters.dateRange?.start || ''}
                onChange={(e) => handleFilterChange({
                  dateRange: {
                    start: e.target.value || undefined,
                    end: filters.dateRange?.end
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                To date
              </label>
              <input
                type="date"
                value={filters.dateRange?.end || ''}
                onChange={(e) => handleFilterChange({
                  dateRange: {
                    start: filters.dateRange?.start,
                    end: e.target.value || undefined
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Filter summary and actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              {hasActiveFilters && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>Active filters:</span>
                  <div className="flex items-center space-x-1">
                    {localSearchQuery && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                        Search: "{localSearchQuery}"
                      </span>
                    )}
                    {filters.mimeType && (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                        Type: {filters.mimeType}
                      </span>
                    )}
                    {(filters.sizeRange?.min || filters.sizeRange?.max) && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">
                        Size: {filters.sizeRange?.min ? `${Math.round((filters.sizeRange.min) / (1024 * 1024))}MB+` : ''}
                        {filters.sizeRange?.min && filters.sizeRange?.max ? '-' : ''}
                        {filters.sizeRange?.max ? `${Math.round((filters.sizeRange.max) / (1024 * 1024))}MB` : ''}
                      </span>
                    )}
                    {(filters.dateRange?.start || filters.dateRange?.end) && (
                      <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs">
                        Date: {filters.dateRange?.start || '...'} to {filters.dateRange?.end || 'now'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchAndFilter;