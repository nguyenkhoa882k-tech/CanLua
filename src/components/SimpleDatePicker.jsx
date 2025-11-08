import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

export default function SimpleDatePicker({ value, onChange }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value || new Date());

  const months = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();
  const currentDay = selectedDate.getDate();

  const handleConfirm = () => {
    onChange(selectedDate);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200"
      >
        <Text className="text-base text-gray-800">
          📅 {value.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View className="bg-white rounded-3xl p-6 w-full max-w-md">
            <Text className="text-2xl font-bold text-gray-800 mb-4 text-center">Chọn ngày</Text>

            {/* Year Selector */}
            <View className="flex-row items-center justify-center mb-4">
              <TouchableOpacity
                onPress={() => setSelectedDate(new Date(currentYear - 1, currentMonth, currentDay))}
                className="bg-blue-500 px-4 py-2 rounded-xl"
              >
                <Text className="text-white font-bold">←</Text>
              </TouchableOpacity>
              <Text className="text-2xl font-bold mx-6">{currentYear}</Text>
              <TouchableOpacity
                onPress={() => setSelectedDate(new Date(currentYear + 1, currentMonth, currentDay))}
                className="bg-blue-500 px-4 py-2 rounded-xl"
              >
                <Text className="text-white font-bold">→</Text>
              </TouchableOpacity>
            </View>

            {/* Month Selector */}
            <View className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
              {months.map((month, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedDate(new Date(currentYear, index, Math.min(currentDay, getDaysInMonth(currentYear, index))))}
                  className={`px-3 py-2 rounded-xl ${currentMonth === index ? 'bg-emerald-500' : 'bg-gray-100'}`}
                  style={{ width: '30%' }}
                >
                  <Text className={`text-center text-xs font-semibold ${currentMonth === index ? 'text-white' : 'text-gray-700'}`}>
                    {month}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Day Selector */}
            <View className="flex-row flex-wrap mb-6" style={{ gap: 6 }}>
              {Array.from({ length: getDaysInMonth(currentYear, currentMonth) }, (_, i) => i + 1).map(day => (
                <TouchableOpacity
                  key={day}
                  onPress={() => setSelectedDate(new Date(currentYear, currentMonth, day))}
                  className={`w-10 h-10 rounded-full items-center justify-center ${currentDay === day ? 'bg-emerald-500' : 'bg-gray-100'}`}
                >
                  <Text className={`font-semibold ${currentDay === day ? 'text-white' : 'text-gray-700'}`}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Buttons */}
            <View className="flex-row" style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="flex-1 bg-gray-100 rounded-xl py-4"
              >
                <Text className="text-gray-700 text-center font-bold">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                className="flex-1 bg-emerald-500 rounded-xl py-4"
              >
                <Text className="text-white text-center font-bold">Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
