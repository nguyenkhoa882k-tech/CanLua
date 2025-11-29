import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';

export default function CustomAlert({
  visible,
  title,
  message,
  buttons = [],
  onClose,
}) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, fadeAnim, scaleAnim]);

  const handleButtonPress = button => {
    if (button.onPress) {
      button.onPress();
    }
    if (onClose) {
      onClose();
    }
  };

  // Default button if no buttons provided
  const finalButtons =
    buttons.length > 0 ? buttons : [{ text: 'OK', onPress: onClose }];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.alertBox,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {title && <Text style={styles.title}>{title}</Text>}
          {message && <Text style={styles.message}>{message}</Text>}

          <View style={styles.buttonContainer}>
            {finalButtons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === 'cancel' && styles.cancelButton,
                  button.style === 'destructive' && styles.destructiveButton,
                  finalButtons.length === 1 && styles.singleButton,
                ]}
                onPress={() => handleButtonPress(button)}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === 'cancel' && styles.cancelButtonText,
                    button.style === 'destructive' &&
                      styles.destructiveButtonText,
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  singleButton: {
    backgroundColor: '#10b981',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  destructiveButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#6b7280',
  },
  destructiveButtonText: {
    color: '#fff',
  },
});
