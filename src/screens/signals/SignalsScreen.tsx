import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../../theme';

export const SignalsScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Signals</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  text: { color: COLORS.text, fontSize: FONTS.sizes.xl },
});
