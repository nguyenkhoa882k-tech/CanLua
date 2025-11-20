import { create } from 'zustand';

export const useUIStore = create((set, get) => ({
  // State
  modalVisible: false,
  filterModalVisible: false,
  filterType: 'all',
  selectedYear: new Date().getFullYear(),
  fromDate: new Date(),
  toDate: new Date(),
  searchQuery: '',
  loading: false,

  // Modal Actions
  openModal: () => set({ modalVisible: true }),
  closeModal: () => set({ modalVisible: false }),

  openFilterModal: () => set({ filterModalVisible: true }),
  closeFilterModal: () => set({ filterModalVisible: false }),

  // Filter Actions
  setFilterType: type => set({ filterType: type }),
  setSelectedYear: year => set({ selectedYear: year }),
  setFromDate: date => set({ fromDate: date }),
  setToDate: date => set({ toDate: date }),

  resetFilters: () =>
    set({
      filterType: 'all',
      selectedYear: new Date().getFullYear(),
      fromDate: new Date(),
      toDate: new Date(),
    }),

  // Search Actions
  setSearchQuery: query => set({ searchQuery: query }),
  clearSearch: () => set({ searchQuery: '' }),

  // Loading Actions
  setLoading: loading => set({ loading }),

  // Selectors
  isModalVisible: () => get().modalVisible,
  isFilterModalVisible: () => get().filterModalVisible,
  getFilterType: () => get().filterType,
  getSelectedYear: () => get().selectedYear,
  getSearchQuery: () => get().searchQuery,
}));
